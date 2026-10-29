<template>
  <div class="h-full flex flex-col items-center justify-center p-4">
    <!-- 顶部状态栏 -->
    <div class="w-full flex items-center justify-between text-xs text-slate-400 mb-2 px-2">
      <div class="flex items-center gap-2">
        <span class="font-medium text-slate-200">尺寸: {{ info.width }}x{{ info.height }}</span>
        <span>•</span>
        <span>帧率: {{ Math.round(info.fps || 0) }} fps</span>
        <span>•</span>
        <span>总帧数: {{ playback.totalFrames }}</span>
      </div>
      <div class="text-xs text-emerald-400 flex items-center gap-1 font-mono">
        <span>Tencent PAG (WebAssembly)</span>
      </div>
    </div>

    <!-- 播放器视口 -->
    <div class="relative flex-1 w-full flex items-center justify-center overflow-hidden">
      <canvas 
        ref="canvasRef" 
        class="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
        :style="{ transform: `scale(${playback.zoom})` }"
      ></canvas>

      <!-- 加载提示 -->
      <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm text-slate-300">
        <div class="animate-spin w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full mb-3"></div>
        <p class="text-xs">正在初始化 PAG WebAssembly 引擎...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { PAGInit } from 'libpag';
import type { AnimationInfo, PlaybackState, DynamicReplaceItem } from '../../types';

const props = defineProps<{
  file: File;
  info: AnimationInfo;
  playback: PlaybackState;
  dynamicItems?: DynamicReplaceItem[];
}>();

const emit = defineEmits<{
  (e: 'update:playback', playback: Partial<PlaybackState>): void;
  (e: 'update:info', info: Partial<AnimationInfo>): void;
  (e: 'update:dynamicItems', items: DynamicReplaceItem[]): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const loading = ref(true);
let pagView: any = null;
let pagFile: any = null;
let PAGModule: any = null;
let trackingTimer: number | null = null;

let virtualNow = performance.now();
let lastRealNow = performance.now();

async function loadPag() {
  if (!canvasRef.value) return;
  loading.value = true;

  try {
    // 优先使用本地 public 目录下的 wasm 文件，若受限则降级至 CDN
    const baseUrl = import.meta.env.BASE_URL || './';
    PAGModule = await PAGInit({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) {
          return `${baseUrl}${file}`;
        }
        return `https://unpkg.com/libpag@4.2.110/lib/${file}`;
      }
    });

    const buffer = await props.file.arrayBuffer();
    pagFile = await PAGModule.PAGFile.load(buffer);

    const width = pagFile.width();
    const height = pagFile.height();
    const duration = pagFile.duration() / 1000000; // 微秒转秒
    const totalFrames = Math.max(Math.round(pagFile.duration() * pagFile.frameRate() / 1000000), 1);
    const fps = pagFile.frameRate();

    emit('update:info', { width, height, fps });
    emit('update:playback', {
      fps,
      totalFrames,
      duration,
      currentFrame: 0,
      currentTime: 0
    });

    canvasRef.value.width = width;
    canvasRef.value.height = height;

    pagView = await PAGModule.PAGView.init(pagFile, canvasRef.value);
    pagView.setRepeatCount(props.playback.isLoop ? 0 : 1);

    // 注入虚拟时间控制以支持 0.25x - 2.0x 动态倍速调节
    virtualNow = performance.now();
    lastRealNow = performance.now();
    pagView.getNowTime = () => {
      const realNow = performance.now();
      virtualNow += (realNow - lastRealNow) * (props.playback.speed || 1.0);
      lastRealNow = realNow;
      return virtualNow;
    };

    // 探测可编辑文本与占位图图层
    extractPagEditables();

    loading.value = false;

    if (props.playback.isPlaying) {
      await pagView.play();
      trackProgress();
    }
  } catch (err) {
    console.error('Failed to load PAG:', err);
    loading.value = false;
  }
}

function extractPagEditables() {
  if (!pagFile) return;
  const items: DynamicReplaceItem[] = [];

  const numTexts = pagFile.numTexts();
  for (let i = 0; i < numTexts; i++) {
    const textData = pagFile.getTextData(i);
    items.push({
      key: `text_${i}`,
      type: 'text',
      label: `文本图层 #${i}`,
      value: textData?.text || ''
    });
  }

  const numImages = pagFile.numImages();
  for (let i = 0; i < numImages; i++) {
    items.push({
      key: `image_${i}`,
      type: 'image',
      label: `图片图层 #${i}`,
      value: ''
    });
  }

  emit('update:dynamicItems', items);
}

function trackProgress() {
  if (!pagView) return;
  const progress = pagView.getProgress();
  const maxFrames = Math.max((props.playback.totalFrames || 1) - 1, 0);
  const currentFrame = Math.min(Math.round(progress * maxFrames), maxFrames);
  
  emit('update:playback', {
    currentFrame,
    currentTime: currentFrame / (props.info.fps || 30)
  });

  if (!props.playback.isLoop && progress >= 0.999) {
    emit('update:playback', { isPlaying: false });
    if (trackingTimer) cancelAnimationFrame(trackingTimer);
    return;
  }

  if (props.playback.isPlaying) {
    trackingTimer = requestAnimationFrame(trackProgress);
  }
}

watch(() => props.playback.isPlaying, async (playing) => {
  if (!pagView) return;
  if (playing) {
    // 若已到末尾则回绕到第 0 帧再播放
    if (pagView.getProgress() >= 0.999) {
      pagView.setProgress(0);
    }
    lastRealNow = performance.now();
    await pagView.play();
    trackProgress();
  } else {
    pagView.pause();
    if (trackingTimer) cancelAnimationFrame(trackingTimer);
  }
});

watch(() => props.playback.speed, () => {
  lastRealNow = performance.now();
});

watch(() => props.playback.isLoop, (loop) => {
  if (pagView) {
    pagView.setRepeatCount(loop ? 0 : 1);
  }
});

watch(() => props.playback.currentFrame, async (frame) => {
  if (pagView && props.playback.totalFrames > 1) {
    const maxFrames = Math.max(props.playback.totalFrames - 1, 1);
    const progress = Math.min(Math.max(frame / maxFrames, 0), 1);
    pagView.setProgress(progress);
    await pagView.flush();
  }
});

// 监听动态替换变化
watch(() => props.dynamicItems, async (items) => {
  if (!pagFile || !items || !PAGModule) return;
  for (const item of items) {
    if (item.type === 'text' && item.key.startsWith('text_')) {
      const idx = parseInt(item.key.replace('text_', ''), 10);
      const textData = pagFile.getTextData(idx);
      if (textData) {
        textData.text = item.value;
        pagFile.replaceText(idx, textData);
      }
    } else if (item.type === 'image' && item.key.startsWith('image_') && item.value) {
      const idx = parseInt(item.key.replace('image_', ''), 10);
      const img = new Image();
      img.src = item.value;
      await new Promise((res) => { img.onload = res; });
      const pagImage = PAGModule.PAGImage.fromSource(img);
      pagFile.replaceImage(idx, pagImage);
    }
  }
  if (pagView) await pagView.flush();
}, { deep: true });

onMounted(() => {
  loadPag();
});

onBeforeUnmount(() => {
  if (trackingTimer) cancelAnimationFrame(trackingTimer);
  if (pagView) {
    try { pagView.destroy(); } catch (_) {}
    pagView = null;
  }
  if (pagFile) {
    try { pagFile.destroy(); } catch (_) {}
    pagFile = null;
  }
});
</script>
