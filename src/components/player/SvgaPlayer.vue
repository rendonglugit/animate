<template>
  <div class="h-full flex flex-col items-center justify-center p-4">
    <!-- 顶部状态栏 -->
    <div class="w-full flex items-center justify-between text-xs text-slate-400 mb-2 px-2">
      <div class="flex items-center gap-2">
        <span class="font-medium text-slate-200">尺寸: {{ info.width }}x{{ info.height }}</span>
        <span>•</span>
        <span>帧率: {{ info.fps }} fps</span>
        <span>•</span>
        <span>总帧数: {{ playback.totalFrames }}</span>
      </div>
      <div class="text-xs text-amber-400 font-mono">
        SVGA 经典矢量/位图动画
      </div>
    </div>

    <!-- 播放器视口 -->
    <div 
      ref="containerRef" 
      class="flex-1 w-full flex items-center justify-center overflow-hidden"
      :style="{ transform: `scale(${playback.zoom})` }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import SVGA from 'svgaplayerweb';
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

const containerRef = ref<HTMLDivElement | null>(null);
let player: any = null;
let parser: any = null;

function loadSvga() {
  if (!containerRef.value) return;

  player = new SVGA.Player(containerRef.value);
  parser = new SVGA.Parser();

  player.loops = props.playback.isLoop ? 0 : 1;
  player.clearsAfterStop = false;

  const reader = new FileReader();
  reader.onload = () => {
    parser.load(reader.result, (videoItem: any) => {
      const width = videoItem.videoSize.width;
      const height = videoItem.videoSize.height;
      const fps = videoItem.FPS || 30;
      const totalFrames = Math.max(videoItem.frames || 0, 1);

      emit('update:info', { width, height, fps });
      emit('update:playback', {
        fps,
        totalFrames,
        duration: totalFrames / fps,
        currentFrame: 0,
        currentTime: 0
      });

      // 提取 SVGA 可替换图层（通过 images key 探测）
      const items: DynamicReplaceItem[] = [];
      if (videoItem.images) {
        Object.keys(videoItem.images).forEach((key) => {
          items.push({
            key,
            type: 'image',
            label: `动态图层: ${key}`,
            value: '',
            placeholderUrl: ''
          });
        });
      }
      emit('update:dynamicItems', items);

      player.setVideoItem(videoItem);
      applyDynamicReplacements();

      if (props.playback.isPlaying) {
        player.startAnimation();
      }

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
    }, (err: any) => {
      console.error('SVGA load error:', err);
    });
  };
  reader.readAsArrayBuffer(props.file);
}

function applyDynamicReplacements() {
  if (!player || !props.dynamicItems) return;
  props.dynamicItems.forEach((item) => {
    if (item.value) {
      if (item.type === 'image') {
        player.setImage(item.value, item.key);
      } else if (item.type === 'text') {
        // 设置清晰的文本字号与白色前景色
        player.setText({
          text: item.value,
          size: '24px',
          color: '#ffffff'
        }, item.key);
      }
    }
  });
  if (!props.playback.isPlaying) {
    player.stepToFrame(props.playback.currentFrame, false);
  }
}

watch(() => props.playback.isPlaying, (playing) => {
  if (!player) return;
  if (playing) player.startAnimation();
  else player.pauseAnimation();
});

watch(() => props.playback.isLoop, (loop) => {
  if (player) player.loops = loop ? 0 : 1;
});

watch(() => props.playback.currentFrame, (frame) => {
  if (player) {
    player.stepToFrame(frame, props.playback.isPlaying);
  }
});

watch(() => props.dynamicItems, () => {
  applyDynamicReplacements();
}, { deep: true });

onMounted(() => {
  loadSvga();
});

onBeforeUnmount(() => {
  if (player) {
    try {
      player.stopAnimation();
    } catch (_) {}
    player = null;
  }
  parser = null;
});
</script>
