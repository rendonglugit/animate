<template>
  <div class="h-full flex flex-col items-center justify-center p-4">
    <!-- 顶部状态栏 -->
    <div class="w-full flex items-center justify-between text-xs text-slate-400 mb-2 px-2">
      <div class="flex items-center gap-2">
        <span class="font-medium text-slate-200">尺寸: {{ info.width || '自适应' }}x{{ info.height || '自适应' }}</span>
        <span>•</span>
        <span>总帧数: {{ playback.totalFrames }}</span>
        <span>•</span>
        <span>类型: Spine 2D 骨骼动画</span>
      </div>
      <div class="text-xs text-purple-400 flex items-center gap-2 font-mono">
        <span v-if="skins.length > 0">换装皮肤: {{ skins.length }} 套</span>
        <span>•</span>
        <span v-if="animations.length > 0">动作骨骼: {{ animations.length }} 个</span>
      </div>
    </div>

    <!-- 播放器视口 -->
    <div class="relative flex-1 w-full flex items-center justify-center overflow-hidden">
      <!-- Spine 容器 -->
      <div 
        ref="containerRef" 
        class="w-full h-full flex items-center justify-center overflow-hidden"
        :style="{ transform: `scale(${playback.zoom})` }"
      ></div>

      <!-- 加载中提示 -->
      <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm text-slate-300">
        <div class="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mb-3"></div>
        <p class="text-sm">正在解析 Spine 资源包 (Zip)...</p>
      </div>

      <!-- 离线或纯结构检视模式卡片 -->
      <div v-if="!loading && !hasRuntime" class="absolute inset-0 m-6 flex flex-col items-center justify-center bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center max-w-lg mx-auto overflow-y-auto z-10">
        <div class="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 text-xl mb-3">
          🦴
        </div>
        <h3 class="text-sm font-semibold text-white mb-1">Spine 骨骼包已解析</h3>
        <p class="text-xs text-slate-400 mb-4 max-w-sm">
          已成功提取 Atlas 图集、骨骼 JSON 以及 PNG 纹理元数据：
        </p>

        <!-- 纹理缩略图 -->
        <div v-if="pngUrl" class="w-24 h-24 rounded-lg border border-slate-700 bg-checkered overflow-hidden mb-4 shrink-0 flex items-center justify-center">
          <img :src="pngUrl" class="max-w-full max-h-full object-contain" />
        </div>

        <div class="grid grid-cols-2 gap-3 w-full text-left text-xs mb-4">
          <div class="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
            <span class="text-slate-500 block text-[10px]">包含动作 (Animations)</span>
            <span class="text-purple-300 font-mono font-medium">{{ animations.length }} 个动作</span>
          </div>
          <div class="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
            <span class="text-slate-500 block text-[10px]">包含皮肤 (Skins)</span>
            <span class="text-purple-300 font-mono font-medium">{{ skins.length }} 套换装</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部动作与皮肤切换栏 -->
    <div v-if="animations.length > 0 || skins.length > 0" class="w-full mt-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-wrap items-center gap-4 text-xs">
      <!-- 动作选择 -->
      <div class="flex items-center gap-2">
        <span class="text-slate-400">动作 (Animation):</span>
        <select v-model="currentAnimation" @change="onAnimationChange" class="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-white text-xs outline-none cursor-pointer">
          <option v-for="anim in animations" :key="anim" :value="anim">{{ anim }}</option>
        </select>
      </div>

      <div class="h-4 w-px bg-slate-700"></div>

      <!-- 皮肤切换 -->
      <div class="flex items-center gap-2">
        <span class="text-slate-400">皮肤 (Skin / 换装):</span>
        <select v-model="currentSkin" @change="onSkinChange" class="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-white text-xs outline-none cursor-pointer">
          <option v-for="skin in skins" :key="skin" :value="skin">{{ skin }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import JSZip from 'jszip';
import type { AnimationInfo, PlaybackState } from '../../types';

const props = defineProps<{
  file: File;
  info: AnimationInfo;
  playback: PlaybackState;
}>();

const emit = defineEmits<{
  (e: 'update:playback', playback: Partial<PlaybackState>): void;
  (e: 'update:info', info: Partial<AnimationInfo>): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const loading = ref(true);
const hasRuntime = ref(false);
const animations = ref<string[]>([]);
const skins = ref<string[]>([]);
const currentAnimation = ref('');
const currentSkin = ref('default');
const pngUrl = ref('');

let spinePlayerInstance: any = null;
let parsedSkeletonData: any = null;
let atlasBlobUrl = '';
let jsonBlobUrl = '';
const createdBlobUrls: string[] = [];
let trackingTimer: number | null = null;
let currentAnimDuration = 1.0;

// 动态载入 Spine 官方播放器 runtime
async function ensureSpineRuntime(): Promise<any> {
  if ((window as any).spine) return (window as any).spine;

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('spine-player-script');
    if (existing) {
      if ((window as any).spine) return resolve((window as any).spine);
      existing.addEventListener('load', () => resolve((window as any).spine));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'spine-player-script';
    script.src = 'https://unpkg.com/@esotericsoftware/spine-player@4.2.66/dist/iife/spine-player.js';
    script.onload = () => resolve((window as any).spine);
    script.onerror = reject;
    document.head.appendChild(script);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/@esotericsoftware/spine-player@4.2.66/dist/spine-player.css';
    document.head.appendChild(link);
  });
}

function updateAnimationMetrics(animName: string) {
  if (!parsedSkeletonData || !parsedSkeletonData.animations) return;
  const animObj = parsedSkeletonData.animations[animName];
  if (animObj) {
    let maxTime = 0;
    // 遍历关键帧找出最长时长
    Object.keys(animObj).forEach(key => {
      const track = animObj[key];
      if (Array.isArray(track)) {
        track.forEach(kf => {
          if (typeof kf.time === 'number') maxTime = Math.max(maxTime, kf.time);
        });
      } else if (typeof track === 'object' && track !== null) {
        Object.keys(track).forEach(subKey => {
          const subTrack = track[subKey];
          if (Array.isArray(subTrack)) {
            subTrack.forEach(kf => {
              if (typeof kf.time === 'number') maxTime = Math.max(maxTime, kf.time);
            });
          }
        });
      }
    });

    currentAnimDuration = Math.max(maxTime, 0.1);
  } else {
    currentAnimDuration = 2.0;
  }

  const fps = 30;
  const totalFrames = Math.max(Math.round(currentAnimDuration * fps), 1);
  emit('update:info', { fps, duration: currentAnimDuration });
  emit('update:playback', {
    fps,
    totalFrames,
    duration: currentAnimDuration,
    currentFrame: 0,
    currentTime: 0
  });
}

// 逐帧同步 Spine 播放时间与底部控制条
function trackSpineProgress() {
  if (spinePlayerInstance && spinePlayerInstance.animationState) {
    const track = spinePlayerInstance.animationState.tracks?.[0];
    if (track) {
      const duration = track.animation?.duration || currentAnimDuration || 1;
      const rawTime = track.trackTime || 0;
      const curTime = props.playback.isLoop ? (rawTime % duration) : Math.min(rawTime, duration);
      const curFrame = Math.round(curTime * 30);

      emit('update:playback', {
        currentFrame: curFrame,
        currentTime: curTime
      });

      if (!props.playback.isLoop && rawTime >= duration) {
        emit('update:playback', { isPlaying: false });
        if (spinePlayerInstance.pause) spinePlayerInstance.pause();
        return;
      }
    }
  }

  if (props.playback.isPlaying) {
    trackingTimer = requestAnimationFrame(trackSpineProgress);
  }
}

async function parseSpineZip() {
  loading.value = true;
  try {
    const zip = await JSZip.loadAsync(props.file);
    let atlasText = '';
    let skeletonData: any = null;
    const rawDataURIs: Record<string, string> = {};

    const fileEntries = Object.keys(zip.files);
    for (const fileName of fileEntries) {
      if (fileName.endsWith('.atlas') || fileName.endsWith('.atlas.txt')) {
        atlasText = await zip.files[fileName].async('text');
      } else if (fileName.endsWith('.json') && !fileName.includes('node_modules')) {
        const text = await zip.files[fileName].async('text');
        try {
          skeletonData = JSON.parse(text);
          parsedSkeletonData = skeletonData;
        } catch (_) {}
      } else if (fileName.endsWith('.png')) {
        const blob = await zip.files[fileName].async('blob');
        const url = URL.createObjectURL(blob);
        createdBlobUrls.push(url);
        // 支持全路径以及去除路径前缀的短文件名匹配
        rawDataURIs[fileName] = url;
        const baseName = fileName.split('/').pop();
        if (baseName) rawDataURIs[baseName] = url;
        if (!pngUrl.value) pngUrl.value = url;
      }
    }

    if (skeletonData) {
      if (skeletonData.animations) {
        animations.value = Object.keys(skeletonData.animations);
        if (animations.value.length > 0) {
          currentAnimation.value = animations.value[0];
        }
      }
      if (skeletonData.skins) {
        if (Array.isArray(skeletonData.skins)) {
          skins.value = skeletonData.skins.map((s: any) => s.name);
        } else {
          skins.value = Object.keys(skeletonData.skins);
        }
        if (skins.value.length > 0) {
          currentSkin.value = skins.value[0];
        }
      }
      if (skeletonData.skeleton) {
        emit('update:info', {
          width: skeletonData.skeleton.width || 800,
          height: skeletonData.skeleton.height || 800
        });
      }

      if (currentAnimation.value) {
        updateAnimationMetrics(currentAnimation.value);
      }
    }

    // 尝试启动 WebGL 官方渲染引擎
    if (atlasText && skeletonData && containerRef.value) {
      try {
        const spine = await ensureSpineRuntime();
        if (spine && spine.SpinePlayer) {
          const atlasBlob = new Blob([atlasText], { type: 'text/plain' });
          atlasBlobUrl = URL.createObjectURL(atlasBlob);
          createdBlobUrls.push(atlasBlobUrl);

          const jsonBlob = new Blob([JSON.stringify(skeletonData)], { type: 'application/json' });
          jsonBlobUrl = URL.createObjectURL(jsonBlob);
          createdBlobUrls.push(jsonBlobUrl);

          containerRef.value.innerHTML = '';
          spinePlayerInstance = new spine.SpinePlayer(containerRef.value, {
            jsonUrl: jsonBlobUrl,
            atlasUrl: atlasBlobUrl,
            rawDataURIs: Object.keys(rawDataURIs).length > 0 ? rawDataURIs : undefined,
            animation: currentAnimation.value || undefined,
            skin: currentSkin.value || undefined,
            showControls: false,
            alpha: true,
            backgroundColor: '#00000000',
            success: (player: any) => {
              hasRuntime.value = true;
              loading.value = false;
              if (player) {
                player.speed = props.playback.speed || 1.0;
                if (props.playback.isPlaying) {
                  player.play();
                  trackSpineProgress();
                } else {
                  player.pause();
                }
              }
            },
            error: (err: any) => {
              console.warn('Spine player runtime init failed, switching to metadata view:', err);
              hasRuntime.value = false;
              loading.value = false;
            }
          });
          return;
        }
      } catch (_) {
        // 在离线或CDN受阻时进入结构检视卡片
      }
    }

    loading.value = false;
  } catch (err) {
    console.error('Failed to parse Spine zip file:', err);
    loading.value = false;
  }
}

// 动作切换 (对接正确的 animationState API)
function onAnimationChange() {
  if (spinePlayerInstance && spinePlayerInstance.animationState) {
    try {
      spinePlayerInstance.animationState.setAnimation(0, currentAnimation.value, props.playback.isLoop);
      updateAnimationMetrics(currentAnimation.value);
      if (props.playback.isPlaying) {
        if (spinePlayerInstance.play) spinePlayerInstance.play();
        trackSpineProgress();
      }
    } catch (e) {
      console.warn('Set animation error:', e);
    }
  }
}

// 皮肤换装 (对接正确的 skeleton.setSkinByName API)
function onSkinChange() {
  if (spinePlayerInstance && spinePlayerInstance.skeleton) {
    try {
      spinePlayerInstance.skeleton.setSkinByName(currentSkin.value);
      spinePlayerInstance.skeleton.setSlotsToSetupPose();
      if (spinePlayerInstance.animationState) {
        spinePlayerInstance.animationState.apply(spinePlayerInstance.skeleton);
      }
    } catch (e) {
      console.warn('Set skin error:', e);
    }
  }
}

// 播放 / 暂停联动
watch(() => props.playback.isPlaying, (playing) => {
  if (!spinePlayerInstance) return;
  if (playing) {
    if (spinePlayerInstance.play) spinePlayerInstance.play();
    trackSpineProgress();
  } else {
    if (spinePlayerInstance.pause) spinePlayerInstance.pause();
    if (trackingTimer) cancelAnimationFrame(trackingTimer);
  }
});

// 循环模式联动
watch(() => props.playback.isLoop, (loop) => {
  if (spinePlayerInstance?.animationState?.tracks?.[0]) {
    spinePlayerInstance.animationState.tracks[0].loop = loop;
  }
});

// 播放倍速联动
watch(() => props.playback.speed, (spd) => {
  if (spinePlayerInstance) {
    spinePlayerInstance.speed = spd;
  }
});

// 帧步进 / Seek 联动
watch(() => props.playback.currentFrame, (frame) => {
  if (spinePlayerInstance?.animationState?.tracks?.[0] && !props.playback.isPlaying) {
    const track = spinePlayerInstance.animationState.tracks[0];
    track.trackTime = frame / 30;
  }
});

onMounted(() => {
  parseSpineZip();
});

onBeforeUnmount(() => {
  if (trackingTimer) cancelAnimationFrame(trackingTimer);
  if (spinePlayerInstance && spinePlayerInstance.dispose) {
    try { spinePlayerInstance.dispose(); } catch (_) {}
    spinePlayerInstance = null;
  }
  createdBlobUrls.forEach(url => URL.revokeObjectURL(url));
});
</script>
