<template>
  <div class="h-16 bg-slate-900/90 border-t border-slate-800 px-6 flex items-center justify-between backdrop-blur-md select-none shrink-0 z-20">
    <!-- 左侧：播放控制与步进 -->
    <div class="flex items-center gap-3">
      <!-- 上一帧 -->
      <button 
        @click="stepFrame(-1)"
        :disabled="isImageMode"
        :title="isImageMode ? '动图格式不支持单步排查' : '上一帧 (-1F 逐帧排查)'"
        class="p-2 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-colors"
      >
        <SkipBack class="w-4 h-4" />
      </button>

      <!-- 播放 / 暂停 -->
      <button 
        @click="togglePlay"
        :disabled="isImageMode"
        :title="isImageMode ? '动图由浏览器原生解码播放' : (playback.isPlaying ? '暂停' : '播放')"
        class="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-full transition-colors shadow-lg shadow-indigo-600/20"
      >
        <Pause v-if="playback.isPlaying" class="w-4 h-4 fill-white" />
        <Play v-else class="w-4 h-4 fill-white ml-0.5" />
      </button>

      <!-- 下一帧 -->
      <button 
        @click="stepFrame(1)"
        :disabled="isImageMode"
        :title="isImageMode ? '动图格式不支持单步排查' : '下一帧 (+1F 逐帧排查)'"
        class="p-2 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-colors"
      >
        <SkipForward class="w-4 h-4" />
      </button>

      <!-- 循环开关 -->
      <button 
        @click="toggleLoop"
        :disabled="isImageMode"
        :title="playback.isLoop ? '循环播放已开启' : '单次播放'"
        :class="playback.isLoop ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-white'"
        class="p-2 rounded-lg transition-colors ml-1 disabled:opacity-30 disabled:pointer-events-none"
      >
        <Repeat class="w-4 h-4" />
      </button>
    </div>

    <!-- 中间：帧率进度条与时间 -->
    <div class="flex-1 max-w-xl mx-8 flex items-center gap-4">
      <span class="text-xs font-mono text-slate-400 w-12 text-right">
        {{ isImageMode ? '--:--' : formatTime(playback.currentTime) }}
      </span>

      <div class="relative flex-1 group py-2">
        <input 
          type="range" 
          min="0" 
          :max="Math.max(playback.totalFrames - 1, 0)" 
          :value="playback.currentFrame"
          :disabled="isImageMode"
          @input="onSeek"
          class="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        />
      </div>

      <div class="flex items-center gap-1 text-xs font-mono text-slate-400 w-24">
        <template v-if="isImageMode">
          <span class="text-slate-500 text-[11px]">原生硬解</span>
        </template>
        <template v-else>
          <span class="text-white">{{ playback.currentFrame }}</span>
          <span>/</span>
          <span>{{ playback.totalFrames }}F</span>
        </template>
      </div>
    </div>

    <!-- 右侧：倍速与视口缩放 -->
    <div class="flex items-center gap-4">
      <!-- 播放倍速 (动图模式隐藏) -->
      <div v-if="!isImageMode" class="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-xs">
        <button 
          v-for="s in [0.25, 0.5, 1.0, 2.0]" 
          :key="s"
          @click="setSpeed(s)"
          :class="playback.speed === s ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
          class="px-2 py-1 rounded transition-colors"
        >
          {{ s }}x
        </button>
      </div>

      <!-- 缩放控制 -->
      <div class="flex items-center gap-1 text-xs text-slate-400">
        <button @click="changeZoom(-0.1)" class="p-1 hover:text-white" title="缩小视口"><ZoomOut class="w-3.5 h-3.5" /></button>
        <span class="font-mono w-10 text-center text-slate-300">{{ Math.round(playback.zoom * 100) }}%</span>
        <button @click="changeZoom(0.1)" class="p-1 hover:text-white" title="放大视口"><ZoomIn class="w-3.5 h-3.5" /></button>
        <button @click="resetZoom" class="ml-1 text-[10px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded" title="重置为 100%">1:1</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Play, Pause, SkipBack, SkipForward, Repeat, ZoomIn, ZoomOut } from 'lucide-vue-next';
import type { PlaybackState, AnimationType } from '../types';

const props = defineProps<{
  playback: PlaybackState;
  type?: AnimationType;
}>();

const emit = defineEmits<{
  (e: 'update:playback', playback: Partial<PlaybackState>): void;
}>();

const isImageMode = computed(() => props.type === 'image');

function togglePlay() {
  emit('update:playback', { isPlaying: !props.playback.isPlaying });
}

function toggleLoop() {
  emit('update:playback', { isLoop: !props.playback.isLoop });
}

function stepFrame(delta: number) {
  let nextFrame = props.playback.currentFrame + delta;
  if (nextFrame < 0) nextFrame = 0;
  if (props.playback.totalFrames > 0 && nextFrame >= props.playback.totalFrames) {
    nextFrame = props.playback.totalFrames - 1;
  }
  emit('update:playback', {
    isPlaying: false,
    currentFrame: nextFrame,
    currentTime: nextFrame / (props.playback.fps || 30)
  });
}

function onSeek(e: Event) {
  const target = e.target as HTMLInputElement;
  const frame = parseInt(target.value, 10);
  emit('update:playback', {
    currentFrame: frame,
    currentTime: frame / (props.playback.fps || 30)
  });
}

function setSpeed(speed: number) {
  emit('update:playback', { speed });
}

function changeZoom(delta: number) {
  const newZoom = Math.min(Math.max(props.playback.zoom + delta, 0.2), 3.0);
  emit('update:playback', { zoom: parseFloat(newZoom.toFixed(2)) });
}

function resetZoom() {
  emit('update:playback', { zoom: 1.0 });
}

function formatTime(sec: number): string {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}
</script>
