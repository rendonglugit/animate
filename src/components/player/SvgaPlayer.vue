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
          :class="clearsAfterStop ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700'"
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
          title="测试 SVGA 倒序播放 API"
        >
          <ArrowLeftRight class="w-3 h-3" />
          <span>{{ isReverse ? '倒序播放中' : '倒序播放' }}</span>
        </button>
      </div>
    </div>

    <!-- 播放器视口画布容器 -->
    <div class="flex-1 w-full relative flex items-center justify-center p-4 overflow-hidden">
      <!-- 现代硬件加速 HTML5 Canvas 实体 -->
      <canvas 
        ref="canvasRef" 
        class="transition-all duration-200 drop-shadow-xl"
        :class="getCanvasFitClass()"
        :style="{ 
          transform: `scale(${playback.zoom})`, 
          transformOrigin: 'center center',
          maxWidth: '100%',
          maxHeight: '100%'
        }"
      ></canvas>

      <!-- 加载中遮罩 -->
      <div v-if="isLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm z-20">
        <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
        <p class="text-xs text-slate-300 font-mono">正在多线程解码 SVGA 动画...</p>
      </div>

      <!-- 解析错误提示 -->
      <div v-if="loadingError" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center z-20">
        <AlertTriangle class="w-10 h-10 text-rose-500 mb-2" />
        <h4 class="text-sm font-semibold text-white mb-1">SVGA 解析失败</h4>
        <p class="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed font-mono">{{ loadingError }}</p>
        <button @click="loadSvga" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors cursor-pointer">
          重试加载
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Parser, Player, PLAY_MODE, FILL_MODE } from 'svga-web';
import type VideoEntity from 'svga-web/src/parser/video-entity';
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

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isLoading = ref<boolean>(false);
const loadingError = ref<string | null>(null);

const currentContentMode = ref<'AspectFit' | 'AspectFill' | 'Fill'>(props.svgaOptions?.contentMode || 'AspectFit');
const clearsAfterStop = ref<boolean>(props.svgaOptions?.clearsAfterStop ?? false);
const isReverse = ref<boolean>(props.svgaOptions?.reverse ?? false);

let player: Player | null = null;
let parser: Parser | null = null;
let currentVideoEntity: VideoEntity | null = null;
const blobUrlCache: string[] = [];

// 从 PNG 二进制 ArrayBuffer 的 IHDR chunk 中以纳秒级速度读取宽高
function getPngDimensionsFromBuffer(buffer: ArrayBuffer): { width: number; height: number } | null {
  try {
    const view = new DataView(buffer);
    if (view.byteLength >= 24 && view.getUint32(0) === 0x89504E47) {
      return {
        width: view.getUint32(16),
        height: view.getUint32(20)
      };
    }
  } catch (_) {}
  return null;
}

function getModeTooltip(mode: 'AspectFit' | 'AspectFill' | 'Fill'): string {
  switch (mode) {
    case 'AspectFit': return '保持比例居中完整呈现，不裁剪 (默认推荐)';
    case 'AspectFill': return '保持比例铺满视口，超出裁剪 (全屏背景)';
    case 'Fill': return '拉伸铺满视口';
  }
}

function getCanvasFitClass() {
  switch (currentContentMode.value) {
    case 'AspectFit': return 'object-contain';
    case 'AspectFill': return 'object-cover w-full h-full';
    case 'Fill': return 'object-fill w-full h-full';
  }
}

function setContentMode(mode: 'AspectFit' | 'AspectFill' | 'Fill') {
  currentContentMode.value = mode;
  emit('update:svgaOptions', { contentMode: mode });
}

function toggleClearsAfterStop() {
  clearsAfterStop.value = !clearsAfterStop.value;
  emit('update:svgaOptions', { clearsAfterStop: clearsAfterStop.value });
  if (player) {
    player.set({
      fillMode: clearsAfterStop.value ? FILL_MODE.BACKWARDS : FILL_MODE.FORWARDS
    });
  }
}

function toggleReverse() {
  isReverse.value = !isReverse.value;
  emit('update:svgaOptions', { reverse: isReverse.value });
  if (player && currentVideoEntity) {
    player.set({
      playMode: isReverse.value ? PLAY_MODE.FALLBACKS : PLAY_MODE.FORWARDS
    });
    if (props.playback.isPlaying) {
      player.start();
    }
  }
}

// 动态创建离屏文本 Canvas (带外描边和柔和阴影，解决各色背景对比度问题)
function createTextCanvas(text: string, fontSize = '24px', fontColor = '#ffffff'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const sizeNum = parseInt(fontSize) || 24;

  if (ctx) {
    ctx.font = `bold ${sizeNum}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const metrics = ctx.measureText(text);
    canvas.width = Math.ceil(metrics.width + 24);
    canvas.height = Math.ceil(sizeNum * 1.6);

    ctx.font = `bold ${sizeNum}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // 绘制文字阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = fontColor;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  return canvas;
}

// 应用动态替换项（图片与文本）
async function applyDynamicReplacements(svgaData: VideoEntity) {
  if (!props.dynamicItems) return;

  for (const item of props.dynamicItems) {
    if (!item.value) {
      delete svgaData.dynamicElements[item.key];
      continue;
    }

    if (item.type === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = item.value;
      await new Promise((resolve) => {
        if (img.complete) {
          resolve(null);
        } else {
          img.onload = () => resolve(null);
          img.onerror = () => resolve(null);
        }
      });
      svgaData.dynamicElements[item.key] = { source: img, fit: 'contain' };
    } else if (item.type === 'text') {
      const textCanvas = createTextCanvas(item.value, item.fontSize, item.fontColor);
      svgaData.dynamicElements[item.key] = { source: textCanvas, fit: 'contain' };
    }
  }
}

// 绘制指定单帧
function drawSpecificFrame(frame: number) {
  if (player && currentVideoEntity) {
    player.currentFrame = frame;
    (player as any).renderer?.drawFrame(
      currentVideoEntity.images,
      currentVideoEntity.sprites,
      currentVideoEntity.dynamicElements,
      frame
    );
  }
}

async function loadSvga() {
  if (!canvasRef.value) return;

  cleanup();
  isLoading.value = true;
  loadingError.value = null;

  try {
    const arrayBuffer = await props.file.arrayBuffer();

    // 检查是否为老旧的 SVGA 1.0 (Zip 压缩包格式)
    const header = new Uint8Array(arrayBuffer, 0, 4);
    if (header[0] === 80 && header[1] === 75 && header[2] === 3 && header[3] === 4) {
      throw new Error('当前文件为早期的 SVGA 1.0 (Zip 格式)，现代 Web 播放器标准要求 SVGA 2.0 (Protobuf 格式)。请用 AE 重新导出为 SVGA 2.0 或 PAG/VAP。');
    }

    parser = new Parser();
    player = new Player(canvasRef.value);

    // 调用多线程 WebWorker 进行 Protobuf 解析
    const svgaData = await parser.do(arrayBuffer);
    currentVideoEntity = svgaData;

    const width = svgaData.videoSize.width;
    const height = svgaData.videoSize.height;
    const fps = svgaData.FPS || 30;
    const totalFrames = Math.max(svgaData.frames || 0, 1);
    const spritesCount = svgaData.sprites?.length || 0;
    const audiosCount = Object.keys(svgaData.audios || {}).length;

    emit('update:info', {
      width,
      height,
      fps,
      version: svgaData.version || '2.0',
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

    // 提取所有内置位图素材
    const items: DynamicReplaceItem[] = [];
    for (const [key, rawBuffer] of Object.entries(svgaData.images)) {
      if (rawBuffer instanceof ArrayBuffer) {
        const dim = getPngDimensionsFromBuffer(rawBuffer);
        const blob = new Blob([rawBuffer], { type: 'image/png' });
        const thumbUrl = URL.createObjectURL(blob);
        blobUrlCache.push(thumbUrl);

        const existing = props.dynamicItems?.find(it => it.key === key);

        items.push({
          key,
          type: 'image',
          label: key,
          value: existing?.value || '',
          placeholderUrl: thumbUrl,
          imageWidth: dim?.width,
          imageHeight: dim?.height
        });
      }
    }
    emit('update:dynamicItems', items);

    // 装配并应用动态替换
    await applyDynamicReplacements(svgaData);

    // 统一配置播放器
    const rangeStart = props.svgaOptions?.rangeEnabled ? props.svgaOptions.rangeLocation : 0;
    const rangeEnd = props.svgaOptions?.rangeEnabled && props.svgaOptions.rangeLength > 0
      ? Math.min(props.svgaOptions.rangeLocation + props.svgaOptions.rangeLength, totalFrames - 1)
      : 0;

    player.set({
      loop: props.playback.isLoop ? true : 1,
      fillMode: clearsAfterStop.value ? FILL_MODE.BACKWARDS : FILL_MODE.FORWARDS,
      playMode: isReverse.value ? PLAY_MODE.FALLBACKS : PLAY_MODE.FORWARDS,
      startFrame: rangeStart,
      endFrame: rangeEnd
    });

    // 挂载数据并在 Canvas 上初始化渲染
    await player.mount(svgaData);

    // 监听进度回调
    player.$on('process' as any, () => {
      if (player && props.playback.isPlaying) {
        const cur = player.currentFrame;
        emit('update:playback', {
          currentFrame: cur,
          currentTime: cur / (fps || 30)
        });
      }
    });

    player.$on('end' as any, () => {
      if (!props.playback.isLoop) {
        emit('update:playback', { isPlaying: false });
      }
    });

    // 更新倍速
    updateSpeed(props.playback.speed);

    // 启动播放或停留在第 0 帧
    if (props.playback.isPlaying) {
      player.start();
    } else {
      drawSpecificFrame(0);
    }
  } catch (err: any) {
    console.error('SVGA 加载错误:', err);
    loadingError.value = `解析 SVGA 出错: ${err?.message || err || '未知错误'}`;
  } finally {
    isLoading.value = false;
  }
}

function updateSpeed(speed: number) {
  if (player && (player as any).animator && currentVideoEntity) {
    const s = Math.max(speed || 1.0, 0.1);
    const baseDuration = (currentVideoEntity.frames / currentVideoEntity.FPS) * 1000;
    (player as any).animator.duration = baseDuration / s;
  }
}

// 监听播放/暂停
watch(() => props.playback.isPlaying, (playing) => {
  if (!player) return;
  if (playing) {
    player.resume();
  } else {
    player.pause();
  }
});

// 监听循环播放
watch(() => props.playback.isLoop, (loop) => {
  if (player) {
    player.set({ loop: loop ? true : 1 });
  }
});

// 监听当前帧步进/拖拽
watch(() => props.playback.currentFrame, (frame) => {
  if (player && !props.playback.isPlaying) {
    drawSpecificFrame(frame);
  }
});

// 监听播放倍速
watch(() => props.playback.speed, (s) => {
  updateSpeed(s);
});

// 监听动态替换变化
watch(() => props.dynamicItems, async () => {
  if (currentVideoEntity && player) {
    await applyDynamicReplacements(currentVideoEntity);
    if (!props.playback.isPlaying) {
      drawSpecificFrame(props.playback.currentFrame);
    }
  }
}, { deep: true });

// 监听外部 svgaOptions 变化
watch(() => props.svgaOptions, (newOpts) => {
  if (!newOpts || !player) return;

  if (newOpts.contentMode && newOpts.contentMode !== currentContentMode.value) {
    setContentMode(newOpts.contentMode);
  }

  if (newOpts.clearsAfterStop !== undefined && newOpts.clearsAfterStop !== clearsAfterStop.value) {
    clearsAfterStop.value = newOpts.clearsAfterStop;
    player.set({
      fillMode: clearsAfterStop.value ? FILL_MODE.BACKWARDS : FILL_MODE.FORWARDS
    });
  }

  if (newOpts.reverse !== undefined && newOpts.reverse !== isReverse.value) {
    isReverse.value = newOpts.reverse;
    player.set({
      playMode: isReverse.value ? PLAY_MODE.FALLBACKS : PLAY_MODE.FORWARDS
    });
    if (props.playback.isPlaying) {
      player.start();
    }
  }

  // 区间播放配置
  if (newOpts.rangeEnabled) {
    const start = newOpts.rangeLocation;
    const end = Math.min(newOpts.rangeLocation + newOpts.rangeLength, (props.playback.totalFrames || 30) - 1);
    player.set({
      startFrame: start,
      endFrame: end
    });
    if (props.playback.isPlaying) {
      player.start();
    }
  } else {
    player.set({
      startFrame: 0,
      endFrame: 0
    });
  }
}, { deep: true });

function cleanup() {
  blobUrlCache.forEach(url => URL.revokeObjectURL(url));
  blobUrlCache.length = 0;

  if (player) {
    try {
      player.destroy();
    } catch (_) {}
    player = null;
  }
  if (parser) {
    try {
      parser.destroy();
    } catch (_) {}
    parser = null;
  }
  currentVideoEntity = null;
}

onMounted(() => {
  nextTick(() => {
    loadSvga();
  });
});

onBeforeUnmount(() => {
  cleanup();
});
</script>