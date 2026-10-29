<template>
  <div class="h-full flex flex-col relative select-none">
    <!-- 顶部 SVGA 专属 API 调试与参数栏 -->
    <div class="shrink-0 px-4 py-2 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 text-xs z-10 backdrop-blur-sm">
      <!-- 左侧：参数指标 -->
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          {{ info.version ? `SVGA ${info.version}` : 'SVGA 2.0' }}
        </span>
        <span class="text-slate-300 font-medium">{{ info.width || 0 }}×{{ info.height || 0 }}</span>
        <span class="text-slate-500">•</span>
        <span class="text-slate-400 font-mono">{{ info.fps || 30 }} FPS</span>
        <span class="text-slate-500">•</span>
        <span class="text-slate-400 font-mono">{{ playback.totalFrames }} 帧</span>
        <span v-if="info.spritesCount" class="text-slate-500">•</span>
        <span v-if="info.spritesCount" class="text-slate-400 font-mono">{{ info.spritesCount }} 精灵图层</span>
      </div>

      <!-- 右侧：官方 API 快捷试玩与切换 -->
      <div class="flex items-center gap-2">
        <!-- ContentMode 填充模式切换 -->
        <div class="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-[11px]">
          <span class="text-slate-400 px-1.5 font-sans">模式:</span>
          <button 
            v-for="mode in (['AspectFit', 'AspectFill', 'Fill'] as const)"
            :key="mode"
            @click="setContentMode(mode)"
            :class="currentContentMode === mode ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            class="px-2 py-0.5 rounded transition-colors cursor-pointer"
            :title="getModeTooltip(mode)"
          >
            {{ mode }}
          </button>
        </div>

        <!-- ClearsAfterStop 清屏切换 -->
        <button 
          @click="toggleClearsAfterStop"
          :class="clearsAfterStop ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'"
          class="px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-colors cursor-pointer"
          title="播放停止后是否清空画布：留存最后一帧非常适用于语聊房连击送礼或徽章保留"
        >
          停播清屏: {{ clearsAfterStop ? '开启' : '关闭(留存)' }}
        </button>

        <!-- 倒序播放测试 -->
        <button 
          @click="toggleReverse"
          :class="isReverse ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'"
          class="px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
          title="测试 SVGA 倒序播放 API: startAnimation(true)"
        >
          <ArrowLeftRight class="w-3 h-3" />
          <span>{{ isReverse ? '倒序播放中' : '倒序播放' }}</span>
        </button>
      </div>
    </div>

    <!-- 播放器视口画布容器 -->
    <div class="flex-1 w-full relative flex items-center justify-center overflow-hidden">
      <!-- 视口挂载点 -->
      <div 
        ref="containerRef" 
        class="w-full h-full relative"
        :style="{ transform: `scale(${playback.zoom})`, transformOrigin: 'center center' }"
      ></div>

      <!-- 加载状态或解析错误提示 -->
      <div v-if="loadingError" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center z-20">
        <AlertTriangle class="w-10 h-10 text-rose-500 mb-2" />
        <h4 class="text-sm font-semibold text-white mb-1">SVGA 解析失败</h4>
        <p class="text-xs text-slate-400 max-w-sm mb-4">{{ loadingError }}</p>
        <button @click="loadSvga" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors cursor-pointer">
          重新加载
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import SVGA from 'svgaplayerweb';
import { ArrowLeftRight, AlertTriangle } from 'lucide-vue-next';
import type { AnimationInfo, PlaybackState, DynamicReplaceItem, SvgaApiOptions } from '../../types';

const props = defineProps<{
  file: File;
  info: AnimationInfo;
  playback: PlaybackState;
  dynamicItems?: DynamicReplaceItem[];
  svgaOptions?: SvgaApiOptions;
}>();

const emit = defineEmits<{
  (e: 'update:playback', playback: Partial<PlaybackState>): void;
  (e: 'update:info', info: Partial<AnimationInfo>): void;
  (e: 'update:dynamicItems', items: DynamicReplaceItem[]): void;
  (e: 'update:svgaOptions', options: Partial<SvgaApiOptions>): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const loadingError = ref<string | null>(null);
const currentContentMode = ref<'AspectFit' | 'AspectFill' | 'Fill'>(props.svgaOptions?.contentMode || 'AspectFit');
const clearsAfterStop = ref<boolean>(props.svgaOptions?.clearsAfterStop ?? false);
const isReverse = ref<boolean>(props.svgaOptions?.reverse ?? false);

let player: any = null;
let parser: any = null;
let currentVideoItem: any = null;
let resizeObserver: ResizeObserver | null = null;
let activeBlobUrl: string | null = null;

// 从 PNG base64 数据前 32 字节直接快速提取分辨率宽与高 (IHDR chunk)
function extractPngDimensions(base64: string): { width: number; height: number } | null {
  try {
    const raw = atob(base64.slice(0, 32));
    // 检查是否包含 IHDR (ASCII: 73, 72, 68, 82)
    if (raw.charCodeAt(12) === 73 && raw.charCodeAt(13) === 72 && raw.charCodeAt(14) === 68 && raw.charCodeAt(15) === 82) {
      const width = (raw.charCodeAt(16) << 24) | (raw.charCodeAt(17) << 16) | (raw.charCodeAt(18) << 8) | raw.charCodeAt(19);
      const height = (raw.charCodeAt(20) << 24) | (raw.charCodeAt(21) << 16) | (raw.charCodeAt(22) << 8) | raw.charCodeAt(23);
      return { width, height };
    }
  } catch (_) {}
  return null;
}

function getModeTooltip(mode: 'AspectFit' | 'AspectFill' | 'Fill'): string {
  switch (mode) {
    case 'AspectFit': return '保持比例居中适应视口，完整显示不裁剪 (默认)';
    case 'AspectFill': return '保持比例填满视口，超出边缘进行裁剪';
    case 'Fill': return '非等比拉伸填满视口';
  }
}

function setContentMode(mode: 'AspectFit' | 'AspectFill' | 'Fill') {
  currentContentMode.value = mode;
  emit('update:svgaOptions', { contentMode: mode });
  if (player) {
    player.setContentMode(mode);
    if (!props.playback.isPlaying && player._renderer) {
      player._resize();
      player._renderer.drawFrame(player._currentFrame || 0);
    }
  }
}

function toggleClearsAfterStop() {
  clearsAfterStop.value = !clearsAfterStop.value;
  emit('update:svgaOptions', { clearsAfterStop: clearsAfterStop.value });
  if (player) {
    player.clearsAfterStop = clearsAfterStop.value;
  }
}

function toggleReverse() {
  isReverse.value = !isReverse.value;
  emit('update:svgaOptions', { reverse: isReverse.value });
  if (player && currentVideoItem) {
    if (props.playback.isPlaying) {
      player.startAnimation(isReverse.value);
    }
  }
}

function loadSvga() {
  if (!containerRef.value) return;

  // 清除旧实例与 DOM
  cleanup();
  loadingError.value = null;

  try {
    player = new SVGA.Player(containerRef.value);
    parser = new SVGA.Parser();

    player.loops = props.playback.isLoop ? 0 : 1;
    player.clearsAfterStop = clearsAfterStop.value;
    player.setContentMode(currentContentMode.value);

    // 生成当前文件 Blob URL
    activeBlobUrl = URL.createObjectURL(props.file);

    parser.load(activeBlobUrl, (videoItem: any) => {
      currentVideoItem = videoItem;

      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
        activeBlobUrl = null;
      }

      const width = videoItem.videoSize?.width || 0;
      const height = videoItem.videoSize?.height || 0;
      const fps = videoItem.FPS || 30;
      const totalFrames = Math.max(videoItem.frames || 0, 1);
      const version = videoItem.version || '2.0';
      const spritesCount = Array.isArray(videoItem.sprites) ? videoItem.sprites.length : 0;
      const audiosCount = Array.isArray(videoItem.audios) ? videoItem.audios.length : 0;

      emit('update:info', {
        width,
        height,
        fps,
        version,
        spritesCount,
        audiosCount
      });

      emit('update:playback', {
        fps,
        totalFrames,
        duration: totalFrames / fps,
        currentFrame: 0,
        currentTime: 0
      });

      // 提取 SVGA 内置位图资源与动态替换项
      const items: DynamicReplaceItem[] = [];
      if (videoItem.images) {
        Object.keys(videoItem.images).forEach((key) => {
          const rawBase64 = videoItem.images[key];
          const dim = extractPngDimensions(rawBase64);
          const fullDataUrl = rawBase64.startsWith('data:') 
            ? rawBase64 
            : `data:image/png;base64,${rawBase64}`;

          // 若此前已做过同 Key 替换，则继承用户已配置的 value
          const existing = props.dynamicItems?.find(it => it.key === key);

          items.push({
            key,
            type: 'image',
            label: key,
            value: existing?.value || '',
            placeholderUrl: fullDataUrl,
            imageWidth: dim?.width,
            imageHeight: dim?.height
          });
        });
      }
      emit('update:dynamicItems', items);

      player.setVideoItem(videoItem);
      applyDynamicReplacements();

      // 若处于播放状态，则根据是否倒序开始播放
      if (props.playback.isPlaying) {
        if (props.svgaOptions?.rangeEnabled && props.svgaOptions.rangeLength > 0) {
          player.startAnimationWithRange({
            location: props.svgaOptions.rangeLocation,
            length: props.svgaOptions.rangeLength
          }, isReverse.value);
        } else {
          player.startAnimation(isReverse.value);
        }
      } else {
        player.stepToFrame(0, false);
      }

      // 绑定进度与帧监听
      player.onPercentage((percentage: number) => {
        if (props.playback.isPlaying) {
          const curFrame = Math.min(Math.round(percentage * totalFrames), totalFrames);
          emit('update:playback', {
            currentFrame: curFrame,
            currentTime: curFrame / (fps || 30)
          });
        }
      });

      player.onFinished(() => {
        if (!props.playback.isLoop) {
          emit('update:playback', { isPlaying: false });
        }
      });

      // 调整倍速时长 (若有)
      updateSpeed(props.playback.speed);
    }, (err: any) => {
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
        activeBlobUrl = null;
      }
      console.error('SVGA load error:', err);
      loadingError.value = `解析 SVGA 文件出错: ${err?.message || err || '未知错误'}`;
    });
  } catch (err: any) {
    console.error('SVGA setup exception:', err);
    loadingError.value = `初始化 SVGA 播放器失败: ${err?.message || err}`;
  }
}

function updateSpeed(speed: number) {
  if (player && player._animator && currentVideoItem) {
    const s = Math.max(speed || 1.0, 0.1);
    const baseDuration = (currentVideoItem.frames / currentVideoItem.FPS) * 1000;
    player._animator.duration = baseDuration / s;
  }
}

function applyDynamicReplacements() {
  if (!player) return;
  player.clearDynamicObjects();

  if (props.dynamicItems) {
    props.dynamicItems.forEach((item) => {
      if (item.value) {
        if (item.type === 'image') {
          // 动态图片替换 API
          player.setImage(item.value, item.key);
        } else if (item.type === 'text') {
          // 动态文本替换 API
          player.setText({
            text: item.value,
            size: item.fontSize || '24px',
            color: item.fontColor || '#ffffff',
            family: item.fontFamily || 'Arial',
            offset: { x: item.offsetX || 0, y: item.offsetY || 0 }
          }, item.key);
        }
      }
    });
  }

  // 若处于暂停状态，刷新当前帧展示替换效果
  if (!props.playback.isPlaying && player._renderer) {
    player.stepToFrame(props.playback.currentFrame || 0, false);
  }
}

// 监听播放状态
watch(() => props.playback.isPlaying, (playing) => {
  if (!player || !currentVideoItem) return;
  if (playing) {
    if (props.svgaOptions?.rangeEnabled && props.svgaOptions.rangeLength > 0) {
      player.startAnimationWithRange({
        location: props.svgaOptions.rangeLocation,
        length: props.svgaOptions.rangeLength
      }, isReverse.value);
    } else {
      player.startAnimation(isReverse.value);
    }
  } else {
    player.pauseAnimation();
  }
});

// 监听循环播放
watch(() => props.playback.isLoop, (loop) => {
  if (player) player.loops = loop ? 0 : 1;
});

// 监听当前帧步进与拖拽
watch(() => props.playback.currentFrame, (frame) => {
  if (player && currentVideoItem) {
    player.stepToFrame(frame, props.playback.isPlaying);
  }
});

// 监听播放倍速
watch(() => props.playback.speed, (speed) => {
  updateSpeed(speed);
});

// 监听动态替换变化
watch(() => props.dynamicItems, () => {
  applyDynamicReplacements();
}, { deep: true });

// 监听 svgaOptions 外部传入变化
watch(() => props.svgaOptions, (newOpts) => {
  if (!newOpts) return;
  if (newOpts.contentMode && newOpts.contentMode !== currentContentMode.value) {
    setContentMode(newOpts.contentMode);
  }
  if (newOpts.clearsAfterStop !== undefined && newOpts.clearsAfterStop !== clearsAfterStop.value) {
    clearsAfterStop.value = newOpts.clearsAfterStop;
    if (player) player.clearsAfterStop = clearsAfterStop.value;
  }
  if (newOpts.reverse !== undefined && newOpts.reverse !== isReverse.value) {
    isReverse.value = newOpts.reverse;
    if (player && props.playback.isPlaying) {
      player.startAnimation(isReverse.value);
    }
  }
}, { deep: true });

function cleanup() {
  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl);
    activeBlobUrl = null;
  }
  if (player) {
    try {
      player.stopAnimation(true);
      player.clearDynamicObjects();
    } catch (_) {}
    player = null;
  }
  currentVideoItem = null;
  parser = null;
}

onMounted(() => {
  nextTick(() => {
    loadSvga();

    // 监听视口容器尺寸变化自适应重绘
    if (containerRef.value && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        if (player && currentVideoItem && player._renderer) {
          try {
            player._resize();
            player._renderer.drawFrame(player._currentFrame || 0);
          } catch (_) {}
        }
      });
      resizeObserver.observe(containerRef.value);
    }
  });
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  cleanup();
});
</script>