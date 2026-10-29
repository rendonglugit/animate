<template>
  <div class="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
    <!-- 顶部导航栏 -->
    <header class="h-14 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
          🎭
        </div>
        <div>
          <h1 class="font-semibold text-sm leading-tight text-white flex items-center gap-2">
            Voice Room Animation Lab
            <span class="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded-full font-normal">全格式对齐</span>
          </h1>
          <p class="text-[10px] text-slate-400">PAG · YY-EVA · SVGA · Lottie · Spine · 雪碧图 · APNG/WebP</p>
        </div>
      </div>

      <!-- 背景与场景模拟切换 -->
      <div class="flex items-center gap-3">
        <!-- 快速选择当前动效类型 (如遇特殊扩展名可手动纠正) -->
        <div v-if="currentFile" class="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
          <span>格式解析器:</span>
          <select v-model="currentInfo.type" class="bg-transparent text-indigo-300 font-semibold outline-none cursor-pointer">
            <option value="pag">Tencent PAG</option>
            <option value="vap">YY-EVA / VAP</option>
            <option value="svga">SVGA</option>
            <option value="lottie">Lottie (JSON)</option>
            <option value="spine">Spine 2D</option>
            <option value="spritesheet">雪碧图 (Sprite Sheet)</option>
            <option value="image">APNG / WebP / GIF</option>
          </select>
        </div>

        <!-- 画布背景切换 -->
        <div class="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
          <button 
            @click="background = 'dark'" 
            :class="background === 'dark' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
            class="px-2.5 py-1 rounded transition-colors"
          >
            深色底
          </button>
          <button 
            @click="background = 'light'" 
            :class="background === 'light' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
            class="px-2.5 py-1 rounded transition-colors"
          >
            浅色底
          </button>
          <button 
            @click="background = 'checkered'" 
            :class="background === 'checkered' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
            class="px-2.5 py-1 rounded transition-colors"
          >
            棋盘透明
          </button>
          <button 
            @click="background = 'room'" 
            :class="background === 'room' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
            class="px-2.5 py-1 rounded transition-colors"
          >
            语聊房实景
          </button>
        </div>

        <!-- 官方示例动效下拉快捷试玩 -->
        <div class="relative group">
          <button class="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700/80 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 font-medium cursor-pointer">
            <Sparkles class="w-3.5 h-3.5 text-indigo-400" />
            <span>示例动效 ▾</span>
          </button>
          <div class="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 hidden group-hover:block z-50">
            <div class="px-3 py-1 text-[10px] text-slate-500 font-medium uppercase tracking-wider">选择官方示例试看</div>
            <button 
              v-for="s in sampleAnimations" 
              :key="s.name"
              @click="loadSample(s)"
              class="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-800 flex items-center justify-between transition-colors group/item cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <span>{{ s.icon }}</span>
                <span class="text-slate-200 group-hover/item:text-white font-medium">{{ s.label }}</span>
              </div>
              <span class="text-[10px] text-slate-400 font-mono">{{ s.tag }}</span>
            </button>
          </div>
        </div>

        <!-- 重新上传文件 -->
        <label class="cursor-pointer">
          <span class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1.5">
            <Upload class="w-3.5 h-3.5" />
            <span>打开文件</span>
          </span>
          <input type="file" @change="onFileChange" class="hidden" accept=".pag,.svga,.json,.mp4,.png,.apng,.webp,.gif,.zip" />
        </label>
      </div>
    </header>

    <!-- 中间核心操作与预览区域 -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- 拖拽上传覆盖层或空状态 -->
      <div 
        v-if="!currentFile" 
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
        :class="isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 hover:border-slate-700'"
        class="flex-1 m-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all bg-slate-900/30 text-center p-8 select-none"
      >
        <div class="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400 shadow-xl">
          <UploadCloud class="w-8 h-8" />
        </div>
        <h2 class="text-base font-semibold text-slate-200 mb-1">将动效文件拖放到此处即可本地即时预览</h2>
        <p class="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          纯前端本地即时解码，无需上传服务器。全格式支持：
        </p>

        <!-- 官方本地示例一键体验卡片组 -->
        <div class="w-full max-w-2xl">
          <div class="text-[11px] text-slate-400 mb-3 flex items-center justify-center gap-2">
            <span class="h-px bg-slate-800 flex-1"></span>
            <span>或直接点击下方内置示例动效立即体验 (一键加载)</span>
            <span class="h-px bg-slate-800 flex-1"></span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            <button 
              v-for="s in sampleAnimations" 
              :key="s.name"
              @click="loadSample(s)"
              class="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col items-center gap-1.5 transition-all group shadow-sm hover:shadow-indigo-500/10 cursor-pointer"
            >
              <span class="text-2xl group-hover:scale-110 transition-transform">{{ s.icon }}</span>
              <div class="text-center">
                <span class="text-xs font-medium text-slate-200 block group-hover:text-indigo-300">{{ s.label }}</span>
                <span class="text-[10px] text-slate-500">{{ s.tag }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- 渲染视口 (已有文件时) -->
      <div 
        v-else 
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
        @wheel="onWheelZoom"
        class="flex-1 flex flex-col relative overflow-hidden transition-colors"
        :class="getBgClass()"
      >
        <!-- 拖拽替换覆盖层 -->
        <div v-if="isDragging" class="absolute inset-0 bg-indigo-950/80 border-2 border-dashed border-indigo-400 z-50 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
          <UploadCloud class="w-12 h-12 text-indigo-300 animate-bounce mb-2" />
          <p class="text-sm font-medium text-white">松开鼠标即可替换并载入新动效文件</p>
        </div>
        <!-- 语聊房麦位实景模拟背景 -->
        <div v-if="background === 'room'" class="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 opacity-45 select-none z-0">
          <!-- 语聊房顶部信息栏 -->
          <div class="flex justify-between items-center text-xs text-white max-w-md mx-auto w-full">
            <div class="bg-black/50 px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
              <div class="w-5 h-5 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-[10px]">👑</div>
              <span class="font-medium">甜心心动语音派对 #9527</span>
            </div>
            <div class="bg-black/50 px-2.5 py-1 rounded-full text-[11px] text-white/70 border border-white/10">
              在线 1.2k
            </div>
          </div>

          <!-- 主持位 + 8 个标准麦位模拟 -->
          <div class="max-w-md mx-auto w-full space-y-4 my-auto">
            <!-- 主持位 -->
            <div class="flex flex-col items-center">
              <div class="w-14 h-14 rounded-full border-2 border-amber-400/80 bg-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/20 relative">
                <span class="text-xs font-semibold text-amber-200">房主</span>
                <span class="absolute -bottom-1 bg-amber-500 text-[9px] text-slate-950 font-bold px-1.5 rounded-full">主持</span>
              </div>
            </div>

            <!-- 8 麦位网格 (4 x 2) -->
            <div class="grid grid-cols-4 gap-3">
              <div v-for="i in 8" :key="i" class="flex flex-col items-center gap-1">
                <div class="w-12 h-12 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-xs text-white/60 relative">
                  <span>{{ i }}号麦</span>
                  <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 border border-slate-900"></div>
                </div>
                <span class="text-[10px] text-white/60">开麦中</span>
              </div>
            </div>
          </div>

          <!-- 底部聊天公屏流模拟 -->
          <div class="max-w-md mx-auto w-full text-[11px] space-y-1 text-white/60 pointer-events-none mb-2">
            <p><span class="text-indigo-400 font-medium">系统消息:</span> 欢迎来到心动语聊派对，请文明交流。</p>
            <p><span class="text-amber-300 font-medium">榜一大哥:</span> 送出 浪漫星河全屏大礼物 🎁</p>
          </div>
        </div>

        <!-- 播放器核心容器 (通过 key 保证切换文件时彻底重载) -->
        <div class="flex-1 relative overflow-hidden z-10" :key="currentFileKey">
          <PagPlayer 
            v-if="currentInfo.type === 'pag'" 
            :file="currentFile" 
            :info="currentInfo" 
            :playback="playback" 
            :dynamic-items="dynamicItems" 
            @update:playback="updatePlayback"
            @update:info="updateInfo"
            @update:dynamic-items="updateDynamicItems"
          />
          <VapPlayer 
            v-else-if="currentInfo.type === 'vap'" 
            :file="currentFile" 
            :info="currentInfo" 
            :playback="playback" 
            :dynamic-items="dynamicItems" 
            @update:playback="updatePlayback"
            @update:info="updateInfo"
            @update:dynamic-items="updateDynamicItems"
          />
          <SvgaPlayer 
            v-else-if="currentInfo.type === 'svga'" 
            :file="currentFile" 
            :info="currentInfo" 
            :playback="playback" 
            :dynamic-items="dynamicItems" 
            @update:playback="updatePlayback"
            @update:info="updateInfo"
            @update:dynamic-items="updateDynamicItems"
          />
          <LottiePlayer 
            v-else-if="currentInfo.type === 'lottie'" 
            :file="currentFile" 
            :info="currentInfo" 
            :playback="playback" 
            :dynamic-items="dynamicItems" 
            @update:playback="updatePlayback"
            @update:info="updateInfo"
            @update:dynamic-items="updateDynamicItems"
          />
          <SpinePlayer 
            v-else-if="currentInfo.type === 'spine'" 
            :file="currentFile" 
            :info="currentInfo" 
            :playback="playback" 
            @update:playback="updatePlayback"
            @update:info="updateInfo"
          />
          <SpritesheetPlayer 
            v-else-if="currentInfo.type === 'spritesheet'" 
            :file="currentFile" 
            :info="currentInfo" 
            :playback="playback" 
            @update:playback="updatePlayback"
            @update:info="updateInfo"
          />
          <ImagePlayer 
            v-else-if="currentInfo.type === 'image'" 
            :file="currentFile" 
            :info="currentInfo" 
            :playback="playback" 
            @update:playback="updatePlayback"
            @update:info="updateInfo"
          />
          <!-- 未识别格式回退与手动选择 -->
          <div v-else class="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <AlertCircle class="w-12 h-12 text-amber-400 mb-3" />
            <h3 class="text-sm font-semibold text-white mb-1">未能自动识别该文件格式 ({{ currentFile?.name }})</h3>
            <p class="text-xs text-slate-400 mb-4 max-w-sm leading-relaxed">
              请在右上角下拉菜单或下方快捷按钮中选择对应的动效解析器：
            </p>
            <div class="flex flex-wrap gap-2 justify-center max-w-md">
              <button @click="currentInfo.type = 'pag'" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-indigo-300 font-mono">PAG</button>
              <button @click="currentInfo.type = 'vap'" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-indigo-300 font-mono">YY-EVA / VAP</button>
              <button @click="currentInfo.type = 'svga'" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-indigo-300 font-mono">SVGA</button>
              <button @click="currentInfo.type = 'lottie'" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-indigo-300 font-mono">Lottie (JSON)</button>
              <button @click="currentInfo.type = 'spine'" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-indigo-300 font-mono">Spine (Zip)</button>
              <button @click="currentInfo.type = 'spritesheet'" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-indigo-300 font-mono">雪碧图 (PNG)</button>
            </div>
          </div>
        </div>

        <!-- 图片模式下提示切换雪碧图浮条 -->
        <div v-if="currentInfo.type === 'image'" class="absolute bottom-18 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-slate-700 text-xs text-slate-300 px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2">
          <span>当前为单图/动图硬解模式，若为序列帧雪碧图可一键切换调试：</span>
          <button @click="currentInfo.type = 'spritesheet'" class="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-medium">切为雪碧图</button>
        </div>

        <!-- 底部控制条 -->
        <Controls 
          :playback="playback" 
          :type="currentInfo.type"
          @update:playback="updatePlayback"
        />
      </div>

      <!-- 右侧动态元素与属性检查器面板 -->
      <DynamicInspector 
        v-if="currentFile"
        :info="currentInfo"
        :playback="playback"
        :dynamic-items="dynamicItems"
        @update:dynamic-items="updateDynamicItems"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { Upload, UploadCloud, AlertCircle, Sparkles } from 'lucide-vue-next';
import type { AnimationInfo, PlaybackState, DynamicReplaceItem } from './types';
import { detectFileType } from './utils/detector';

import Controls from './components/Controls.vue';
import DynamicInspector from './components/DynamicInspector.vue';

import PagPlayer from './components/player/PagPlayer.vue';
import VapPlayer from './components/player/VapPlayer.vue';
import SvgaPlayer from './components/player/SvgaPlayer.vue';
import LottiePlayer from './components/player/LottiePlayer.vue';
import SpinePlayer from './components/player/SpinePlayer.vue';
import SpritesheetPlayer from './components/player/SpritesheetPlayer.vue';
import ImagePlayer from './components/player/ImagePlayer.vue';

const isDragging = ref(false);
const currentFile = ref<File | null>(null);
const background = ref<'dark' | 'light' | 'checkered' | 'room'>('dark');

const currentInfo = reactive<AnimationInfo>({
  name: '',
  type: 'unknown',
  size: 0,
  width: 0,
  height: 0,
  duration: 0,
  totalFrames: 0,
  fps: 30
});

const playback = reactive<PlaybackState>({
  isPlaying: true,
  currentFrame: 0,
  totalFrames: 100,
  currentTime: 0,
  duration: 3,
  fps: 30,
  speed: 1.0,
  isLoop: true,
  zoom: 1.0
});

const dynamicItems = ref<DynamicReplaceItem[]>([]);

const sampleAnimations = [
  {
    name: 'sample_pag.pag',
    path: 'sample_pag.pag',
    label: 'Tencent PAG',
    tag: '点赞特效',
    icon: '💎'
  },
  {
    name: 'sample_vap.mp4',
    path: 'sample_vap.mp4',
    label: 'YY-EVA (VAP)',
    tag: '3D大礼物',
    icon: '🎬'
  },
  {
    name: 'sample_svga.svga',
    path: 'sample_svga.svga',
    label: 'SVGA',
    tag: '浪漫玫瑰',
    icon: '🌹'
  },
  {
    name: 'sample_lottie.json',
    path: 'sample_lottie.json',
    label: 'Lottie (JSON)',
    tag: '心动告白',
    icon: '✨'
  },
  {
    name: 'sample_spine.zip',
    path: 'sample_spine.zip',
    label: 'Spine 2D',
    tag: '勋章骨骼',
    icon: '🦴'
  },
  {
    name: 'sample_spritesheet.png',
    path: 'sample_spritesheet.png',
    label: '雪碧图 (Sprite)',
    tag: '4x4 连击',
    icon: '⚡'
  },
  {
    name: 'sample_image.webp',
    path: 'sample_image.webp',
    label: 'WebP 动图',
    tag: '公屏表情',
    icon: '🖼️'
  }
];

const isLoadingSample = ref(false);

async function loadSample(sample: typeof sampleAnimations[0]) {
  isLoadingSample.value = true;
  try {
    const rawBase = import.meta.env.BASE_URL || './';
    const baseUrl = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
    const res = await fetch(`${baseUrl}samples/${sample.path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const file = new File([blob], sample.name, { type: blob.type });
    loadFile(file);
    if (sample.name.includes('spritesheet')) {
      currentInfo.type = 'spritesheet';
    }
  } catch (err) {
    console.error('Failed to load sample:', err);
  } finally {
    isLoadingSample.value = false;
  }
}

const currentFileKey = computed(() => {
  if (!currentFile.value) return '';
  return `${currentFile.value.name}_${currentFile.value.size}_${currentFile.value.lastModified}_${currentInfo.type}`;
});

function updatePlayback(patch: Partial<PlaybackState>) {
  Object.assign(playback, patch);
}

function updateInfo(patch: Partial<AnimationInfo>) {
  Object.assign(currentInfo, patch);
}

function updateDynamicItems(items: DynamicReplaceItem[]) {
  dynamicItems.value = items;
}

function loadFile(file: File) {
  currentFile.value = file;
  const detectedType = detectFileType(file.name, file.type);
  
  currentInfo.name = file.name;
  currentInfo.type = detectedType;
  currentInfo.size = file.size;

  // 重置状态
  playback.isPlaying = true;
  playback.currentFrame = 0;
  playback.speed = 1.0;
  playback.zoom = 1.0;
  dynamicItems.value = [];
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    loadFile(target.files[0]);
  }
  target.value = '';
}

function onWheelZoom(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const newZoom = Math.min(Math.max(playback.zoom + delta, 0.2), 3.0);
    playback.zoom = parseFloat(newZoom.toFixed(2));
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    loadFile(e.dataTransfer.files[0]);
  }
}

function getBgClass() {
  switch (background.value) {
    case 'dark': return 'bg-slate-950';
    case 'light': return 'bg-slate-100 text-slate-800';
    case 'checkered': return 'bg-checkered';
    case 'room': return 'bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950';
    default: return 'bg-slate-950';
  }
}
</script>
