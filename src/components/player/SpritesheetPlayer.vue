<template>
  <div class="h-full flex flex-col items-center justify-center p-4">
    <!-- 顶部状态栏 -->
    <div class="w-full flex items-center justify-between text-xs text-slate-400 mb-2 px-2">
      <div class="flex items-center gap-2">
        <span class="font-medium text-slate-200">尺寸: {{ info.width }}x{{ info.height }}</span>
        <span>•</span>
        <span>文件大小: {{ formattedSize }}</span>
        <span>•</span>
        <span>模式: {{ mode === 'grid' ? '等距网格切分' : '坐标切分' }}</span>
      </div>
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" v-model="showGridOutline" class="rounded border-slate-700 bg-slate-800 text-indigo-500" />
          <span>显示网格轮廓</span>
        </label>
      </div>
    </div>

    <!-- 预览视口 -->
    <div class="relative flex-1 w-full flex items-center justify-center overflow-hidden">
      <!-- 动画单帧播放画布 (支持视口缩放) -->
      <canvas 
        ref="canvasRef" 
        class="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
        :style="{ transform: `scale(${playback.zoom})` }"
      ></canvas>

      <!-- 网格切分调试覆盖层 (可选展开查看原完整大图) -->
      <div v-if="showFullSheet" class="absolute inset-0 bg-slate-950/90 z-20 flex flex-col p-4 backdrop-blur-sm">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm font-semibold text-slate-200">原雪碧图总览 (已切分 {{ computedTotalFrames }} 帧)</span>
          <button @click="showFullSheet = false" class="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300">关闭查看</button>
        </div>
        <div class="flex-1 overflow-auto flex items-center justify-center border border-slate-800 rounded bg-checkered p-2">
          <div class="relative inline-block">
            <img :src="imgSrc" ref="sheetImgRef" class="max-w-none" />
            <!-- 网格线指示 -->
            <div v-if="showGridOutline && mode === 'grid'" 
                 class="absolute inset-0 grid pointer-events-none"
                 :style="{
                   gridTemplateColumns: `repeat(${columns}, 1fr)`,
                   gridTemplateRows: `repeat(${rows}, 1fr)`
                 }">
              <div v-for="idx in (columns * rows)" :key="idx" 
                   class="border text-[9px] p-0.5 transition-colors"
                   :class="idx - 1 < computedTotalFrames ? 'border-indigo-500/50 text-indigo-300 bg-indigo-500/10' : 'border-slate-800 text-slate-600 bg-slate-900/40 opacity-30'">
                {{ idx - 1 }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部雪碧图切分参数快速调节面板 -->
    <div class="w-full mt-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-wrap items-center gap-4 text-xs">
      <div class="flex items-center gap-2">
        <span class="text-slate-400">切分模式:</span>
        <button @click="mode = 'grid'" :class="mode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'" class="px-2.5 py-1 rounded">行列网格 (Grid)</button>
        <button @click="showFullSheet = !showFullSheet" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300">
          {{ showFullSheet ? '隐藏原图' : '查看原图与网格' }}
        </button>
      </div>

      <div class="h-4 w-px bg-slate-700"></div>

      <div class="flex items-center gap-2">
        <span class="text-slate-400">列数 (Cols):</span>
        <input type="number" min="1" max="100" v-model.number="columns" class="w-14 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-white text-center" />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-slate-400">行数 (Rows):</span>
        <input type="number" min="1" max="100" v-model.number="rows" class="w-14 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-white text-center" />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-slate-400">有效帧数:</span>
        <input type="number" min="1" :max="columns * rows" v-model.number="validFrames" class="w-16 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-white text-center" />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-slate-400">单帧尺寸:</span>
        <span class="text-indigo-400 font-mono">{{ Math.round(frameWidth) }} x {{ Math.round(frameHeight) }} px</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import type { AnimationInfo, PlaybackState } from '../../types';
import { formatFileSize } from '../../utils/detector';

const props = defineProps<{
  file: File;
  info: AnimationInfo;
  playback: PlaybackState;
}>();

const emit = defineEmits<{
  (e: 'update:playback', playback: Partial<PlaybackState>): void;
  (e: 'update:info', info: Partial<AnimationInfo>): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const imgSrc = ref('');
const imageObj = new Image();

const mode = ref<'grid' | 'json'>('grid');
const columns = ref(4);
const rows = ref(4);
const validFrames = ref(16);
const showFullSheet = ref(false);
const showGridOutline = ref(true);

const formattedSize = computed(() => formatFileSize(props.info.size));

const frameWidth = computed(() => {
  if (!props.info.width || columns.value <= 0) return 0;
  return props.info.width / columns.value;
});

const frameHeight = computed(() => {
  if (!props.info.height || rows.value <= 0) return 0;
  return props.info.height / rows.value;
});

const computedTotalFrames = computed(() => {
  return Math.max(Math.min(validFrames.value, columns.value * rows.value), 1);
});

let animFrameId: number | null = null;
let lastTick = performance.now();

// 绘制单帧
function renderFrame(index: number) {
  if (!canvasRef.value || !imageObj.complete || frameWidth.value <= 0 || frameHeight.value <= 0) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  const fw = Math.round(frameWidth.value);
  const fh = Math.round(frameHeight.value);

  // 仅在尺寸变动时调整尺寸以避免清屏损耗
  if (canvasRef.value.width !== fw) canvasRef.value.width = fw;
  if (canvasRef.value.height !== fh) canvasRef.value.height = fh;

  const col = index % columns.value;
  const row = Math.floor(index / columns.value);

  const sx = col * frameWidth.value;
  const sy = row * frameHeight.value;

  ctx.clearRect(0, 0, fw, fh);
  ctx.drawImage(
    imageObj,
    sx, sy, frameWidth.value, frameHeight.value,
    0, 0, fw, fh
  );
}

// 动画主循环
function tick(now: number) {
  if (props.playback.isPlaying) {
    const elapsed = (now - lastTick) / 1000;
    const interval = 1 / ((props.playback.fps || 30) * (props.playback.speed || 1));

    if (elapsed >= interval) {
      lastTick = now - (elapsed % interval);
      let nextFrame = props.playback.currentFrame + 1;
      if (nextFrame >= computedTotalFrames.value) {
        if (props.playback.isLoop) {
          nextFrame = 0;
        } else {
          nextFrame = computedTotalFrames.value - 1;
          emit('update:playback', { isPlaying: false });
        }
      }
      emit('update:playback', {
        currentFrame: nextFrame,
        currentTime: nextFrame / (props.playback.fps || 30)
      });
      renderFrame(nextFrame);
    }
  }
  animFrameId = requestAnimationFrame(tick);
}

watch(() => props.playback.isPlaying, (playing) => {
  if (playing) {
    lastTick = performance.now();
  }
});

watch(() => props.playback.currentFrame, (newFrame) => {
  renderFrame(newFrame);
});

watch([columns, rows, validFrames], () => {
  const total = computedTotalFrames.value;
  emit('update:playback', {
    totalFrames: total,
    duration: total / (props.playback.fps || 30)
  });
  renderFrame(props.playback.currentFrame % total);
});

onMounted(() => {
  imgSrc.value = URL.createObjectURL(props.file);
  imageObj.src = imgSrc.value;
  imageObj.onload = () => {
    emit('update:info', {
      width: imageObj.naturalWidth,
      height: imageObj.naturalHeight,
      fps: 30
    });

    // 智能猜测行列比
    if (imageObj.naturalWidth > imageObj.naturalHeight * 2) {
      columns.value = Math.round(imageObj.naturalWidth / imageObj.naturalHeight);
      rows.value = 1;
    } else if (imageObj.naturalHeight > imageObj.naturalWidth * 2) {
      rows.value = Math.round(imageObj.naturalHeight / imageObj.naturalWidth);
      columns.value = 1;
    }
    validFrames.value = columns.value * rows.value;

    const total = computedTotalFrames.value;
    emit('update:playback', {
      totalFrames: total,
      duration: total / (props.playback.fps || 30)
    });

    renderFrame(0);
    animFrameId = requestAnimationFrame(tick);
  };
});

onBeforeUnmount(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (imgSrc.value) URL.revokeObjectURL(imgSrc.value);
});
</script>
