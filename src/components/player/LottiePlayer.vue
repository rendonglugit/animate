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
      <div class="text-xs text-indigo-400 font-mono">
        Lottie (Bodymovin) 矢量/位图渲染
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
import lottie, { type AnimationItem } from 'lottie-web';
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
let animInstance: AnimationItem | null = null;
let originalJsonString = '';

function loadLottie() {
  if (!containerRef.value) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      originalJsonString = e.target?.result as string;
      const animationData = JSON.parse(originalJsonString);
      
      const width = animationData.w || 800;
      const height = animationData.h || 800;
      const fps = Math.round(animationData.fr || 30);
      const totalFrames = Math.max(Math.round(animationData.op - animationData.ip) || 0, 1);

      emit('update:info', { width, height, fps });
      emit('update:playback', {
        fps,
        totalFrames,
        duration: totalFrames / fps,
        currentFrame: 0,
        currentTime: 0
      });

      // 提取动态文本和图片图层 (支持子合成递归)
      extractDynamicItems(animationData);

      // 创建 Lottie 实例
      createInstance(animationData, 0);
    } catch (err) {
      console.error('Failed to parse Lottie JSON', err);
    }
  };
  reader.readAsText(props.file);
}

// 统一创建 Lottie 实例并绑定完整生命周期事件与倍速
function createInstance(data: any, startFrame = 0) {
  if (!containerRef.value) return;
  if (animInstance) {
    animInstance.destroy();
    animInstance = null;
  }
  containerRef.value.innerHTML = '';

  animInstance = lottie.loadAnimation({
    container: containerRef.value,
    renderer: 'svg',
    loop: props.playback.isLoop,
    autoplay: props.playback.isPlaying,
    animationData: data,
  });

  animInstance.setSpeed(props.playback.speed || 1.0);

  animInstance.addEventListener('enterFrame', () => {
    if (animInstance && props.playback.isPlaying) {
      const cur = Math.round(animInstance.currentFrame);
      emit('update:playback', {
        currentFrame: cur,
        currentTime: cur / (props.info.fps || 30)
      });
    }
  });

  animInstance.addEventListener('complete', () => {
    if (!props.playback.isLoop) {
      emit('update:playback', { isPlaying: false });
    }
  });

  if (startFrame > 0) {
    if (props.playback.isPlaying) {
      animInstance.goToAndPlay(startFrame, true);
    } else {
      animInstance.goToAndStop(startFrame, true);
    }
  }
}

// 深度解析可替换项（同时检索顶层 layers 与 assets 中的预合成 precomps）
function extractDynamicItems(data: any) {
  const items: DynamicReplaceItem[] = [];

  // 1. 检索图片 assets
  if (Array.isArray(data.assets)) {
    data.assets.forEach((asset: any) => {
      if (asset.p && (asset.p.startsWith('data:image') || asset.p.endsWith('.png') || asset.p.endsWith('.jpg') || asset.p.endsWith('.webp'))) {
        const fullUrl = asset.u ? asset.u + asset.p : asset.p;
        items.push({
          key: `asset_${asset.id}`,
          type: 'image',
          label: `图片: ${asset.id}`,
          value: fullUrl,
          placeholderUrl: fullUrl
        });
      }
    });
  }

  // 2. 递归检索文本图层 (ty === 5)
  function scanLayers(layers: any[], scopeName: string) {
    if (!Array.isArray(layers)) return;
    layers.forEach((layer: any) => {
      if (layer.ty === 5) {
        let textVal = '';
        if (layer.t?.d?.k?.[0]?.s?.t) {
          textVal = layer.t.d.k[0].s.t;
        } else if (layer.t?.d?.k?.s?.t) {
          textVal = layer.t.d.k.s.t;
        } else if (typeof layer.t?.d?.k === 'string') {
          textVal = layer.t.d.k;
        }

        const layerKey = `text_${scopeName}_${layer.ind || layer.nm}`;
        items.push({
          key: layerKey,
          type: 'text',
          label: `${scopeName}: ${layer.nm || layer.ind}`,
          value: textVal
        });
      }
    });
  }

  // 顶层图层
  scanLayers(data.layers, '顶层文字');

  // assets 预合成图层
  if (Array.isArray(data.assets)) {
    data.assets.forEach((asset: any) => {
      if (Array.isArray(asset.layers)) {
        scanLayers(asset.layers, `合成[${asset.id}]`);
      }
    });
  }

  emit('update:dynamicItems', items);
}

// 应用动态替换生成干净数据并重载
function applyDynamicReplacements() {
  if (!originalJsonString || !props.dynamicItems) return;
  const cloneData = JSON.parse(originalJsonString);

  props.dynamicItems.forEach((item) => {
    if (item.type === 'text') {
      const updateTextInLayers = (layers: any[]) => {
        if (!Array.isArray(layers)) return;
        layers.forEach((l: any) => {
          if (l.ty === 5) {
            if (l.t?.d?.k?.[0]?.s) {
              l.t.d.k[0].s.t = item.value;
            } else if (l.t?.d?.k?.s) {
              l.t.d.k.s.t = item.value;
            }
          }
        });
      };

      updateTextInLayers(cloneData.layers);
      if (Array.isArray(cloneData.assets)) {
        cloneData.assets.forEach((asset: any) => {
          if (Array.isArray(asset.layers)) {
            updateTextInLayers(asset.layers);
          }
        });
      }
    } else if (item.type === 'image' && item.value) {
      if (Array.isArray(cloneData.assets)) {
        const assetId = item.key.replace('asset_', '');
        const target = cloneData.assets.find((a: any) => a.id === assetId || a.id === item.key);
        if (target) {
          target.p = item.value;
          target.u = '';
        }
      }
    }
  });

  const curFrame = animInstance ? animInstance.currentFrame : 0;
  createInstance(cloneData, curFrame);
}

// 监听播放状态
watch(() => props.playback.isPlaying, (playing) => {
  if (!animInstance) return;
  if (playing) animInstance.play();
  else animInstance.pause();
});

// 监听逐帧单步前进/后退及进度条 Seek
watch(() => props.playback.currentFrame, (frame) => {
  if (animInstance) {
    if (props.playback.isPlaying) {
      animInstance.goToAndPlay(frame, true);
    } else {
      animInstance.goToAndStop(frame, true);
    }
  }
});

watch(() => props.playback.speed, (spd) => {
  if (animInstance) animInstance.setSpeed(spd);
});

watch(() => props.playback.isLoop, (loop) => {
  if (animInstance) animInstance.loop = loop;
});

// 监听动态替换更新（添加防抖）
let dynamicDebounce: number | null = null;
watch(() => props.dynamicItems, () => {
  if (dynamicDebounce) clearTimeout(dynamicDebounce);
  dynamicDebounce = window.setTimeout(() => {
    applyDynamicReplacements();
  }, 250);
}, { deep: true });

onMounted(() => {
  loadLottie();
});

onBeforeUnmount(() => {
  if (dynamicDebounce) clearTimeout(dynamicDebounce);
  if (animInstance) {
    animInstance.destroy();
    animInstance = null;
  }
});
</script>
