<template>
  <div class="h-full flex flex-col items-center justify-center p-4">
    <!-- 顶部状态栏 -->
    <div class="w-full flex items-center justify-between text-xs text-slate-400 mb-2 px-2">
      <div class="flex items-center gap-2">
        <span class="font-medium text-slate-200">尺寸: {{ info.width || '-' }}x{{ info.height || '-' }}</span>
        <span>•</span>
        <span>大小: {{ formattedSize }}</span>
        <span>•</span>
        <span class="uppercase font-mono text-indigo-400">{{ formatType }}</span>
      </div>
      <div class="text-[11px] text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
        浏览器原生透明通道硬解渲染
      </div>
    </div>

    <!-- 预览视口 -->
    <div class="relative flex-1 w-full flex items-center justify-center overflow-hidden">
      <img 
        :src="imgSrc" 
        :style="{ transform: `scale(${playback.zoom})` }" 
        class="max-w-full max-h-full object-contain shadow-2xl rounded-lg transition-transform duration-100" 
      />
    </div>

    <div class="text-[11px] text-slate-500 mt-2">
      提示: 浏览器原生硬解渲染 APNG / WebP / GIF，保留完整色彩与透明通道。原生动图不支持外部单步跳帧。
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
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

const imgSrc = ref('');
const formattedSize = computed(() => formatFileSize(props.info.size));
const formatType = computed(() => props.file.name.split('.').pop() || 'IMG');

onMounted(() => {
  imgSrc.value = URL.createObjectURL(props.file);
  const img = new Image();
  img.src = imgSrc.value;
  img.onload = () => {
    emit('update:info', {
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    emit('update:playback', {
      isPlaying: true,
      totalFrames: 1,
      currentFrame: 0,
      duration: 0
    });
  };
});

onBeforeUnmount(() => {
  if (imgSrc.value) {
    URL.revokeObjectURL(imgSrc.value);
    imgSrc.value = '';
  }
});
</script>
