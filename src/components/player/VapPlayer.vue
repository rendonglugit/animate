<template>
  <div class="h-full flex flex-col items-center justify-center p-4">
    <!-- 顶部状态栏 -->
    <div class="w-full flex items-center justify-between text-xs text-slate-400 mb-2 px-2">
      <div class="flex items-center gap-2">
        <span class="font-medium text-slate-200">尺寸: {{ info.width || '-' }}x{{ info.height || '-' }}</span>
        <span>•</span>
        <span>总帧数: {{ playback.totalFrames }}</span>
        <span>•</span>
        <span>帧率: {{ info.fps || 30 }} fps</span>
        <span>•</span>
        <span>通道: {{ isEmbeddedVapc ? '内置 VAPC 配置' : '自动 50% Alpha 分割' }}</span>
      </div>
      <div class="text-xs text-cyan-400 font-mono flex items-center gap-1.5">
        <span>YY-EVA / VAP WebGL 硬件解码</span>
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
import Vap from 'video-animation-player';
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
const isEmbeddedVapc = ref(false);
let vapInstance: any = null;
let videoUrl = '';
let currentConfig: any = null;

// 从 MP4 二进制流中安全提取嵌入的 vapc 元数据 Box
async function extractVapcConfig(file: File): Promise<any | null> {
  try {
    const buffer = await file.arrayBuffer();
    const u8 = new Uint8Array(buffer);
    // 搜索 'vapc' 标签
    for (let i = 4; i < u8.length - 20; i++) {
      if (u8[i] === 0x76 && u8[i+1] === 0x61 && u8[i+2] === 0x70 && u8[i+3] === 0x63) { // 'vapc'
        const size = (u8[i-4] << 24) | (u8[i-3] << 16) | (u8[i-2] << 8) | u8[i-1];
        const payloadLen = size > 8 ? size - 8 : 100000;
        const jsonBytes = u8.subarray(i + 4, Math.min(i + 4 + payloadLen, u8.length));
        const text = new TextDecoder('utf-8').decode(jsonBytes);
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          return JSON.parse(text.substring(start, end + 1));
        }
      }
    }
  } catch (e) {
    console.warn('VAPC box parse warning:', e);
  }
  return null;
}

// 探测视频基础几何尺寸（时长、宽高）
function probeVideoMeta(url: string): Promise<{ videoW: number; videoH: number; duration: number }> {
  return new Promise((resolve) => {
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      resolve({
        videoW: tempVideo.videoWidth || 1500,
        videoH: tempVideo.videoHeight || 750,
        duration: tempVideo.duration || 3
      });
    };
    tempVideo.onerror = () => {
      resolve({ videoW: 1500, videoH: 750, duration: 3 });
    };
  });
}

async function initVap() {
  if (!containerRef.value) return;

  if (videoUrl) URL.revokeObjectURL(videoUrl);
  videoUrl = URL.createObjectURL(props.file);

  // 1. 尝试提取内置 vapc
  const parsedConfig = await extractVapcConfig(props.file);

  if (parsedConfig && parsedConfig.info) {
    isEmbeddedVapc.value = true;
    currentConfig = parsedConfig;

    // 提取动态融合字段
    if (parsedConfig.src && Array.isArray(parsedConfig.src) && (!props.dynamicItems || props.dynamicItems.length === 0)) {
      const items: DynamicReplaceItem[] = parsedConfig.src.map((s: any, idx: number) => {
        const rawTag = s.srcTag || `item_${idx}`;
        const cleanTag = rawTag.replace(/[\[\]]/g, '');
        return {
          key: cleanTag,
          type: s.srcType === 'txt' ? 'text' : 'image',
          label: s.srcTag || `图层: ${cleanTag}`,
          value: s.textStr || (s.srcType === 'txt' ? '心动主播' : '')
        };
      });
      emit('update:dynamicItems', items);
    }
  } else {
    // 2. 无 vapc 配置时自动探测分辨率生成默认双通道 Mask（默认左右通道：左 RGB，右 Alpha）
    isEmbeddedVapc.value = false;
    const meta = await probeVideoMeta(videoUrl);
    const targetW = Math.round(meta.videoW / 2);
    const targetH = meta.videoH;
    const totalFrames = Math.max(Math.round(meta.duration * 30), 1);

    currentConfig = {
      info: {
        v: 2,
        f: totalFrames,
        w: targetW,
        h: targetH,
        fps: 30,
        videoW: meta.videoW,
        videoH: meta.videoH,
        aFrame: [targetW, 0, targetW, targetH],
        rgbFrame: [0, 0, targetW, targetH],
        isVapx: 0
      }
    };

    if (!props.dynamicItems || props.dynamicItems.length === 0) {
      emit('update:dynamicItems', [
        { key: 'sNickName', type: 'text', label: '发送者昵称', value: '语聊房榜一大哥' },
        { key: 'sAvatar', type: 'image', label: '发送者头像', value: '' },
        { key: 'tNickName', type: 'text', label: '接收者昵称', value: '心动麦位主播' },
        { key: 'tAvatar', type: 'image', label: '接收者头像', value: '' },
      ]);
    }
  }

  const w = currentConfig.info.w || 750;
  const h = currentConfig.info.h || 750;
  const fps = currentConfig.info.fps || 30;
  const totalFrames = currentConfig.info.f || Math.max(Math.round(3 * fps), 1);

  emit('update:info', { width: w, height: h, fps, duration: totalFrames / fps });
  emit('update:playback', {
    fps,
    totalFrames,
    duration: totalFrames / fps,
    currentFrame: 0,
    currentTime: 0
  });

  playVapInstance();
}

function playVapInstance() {
  if (!containerRef.value || !currentConfig) return;

  if (vapInstance) {
    try { vapInstance.destroy(); } catch (_) {}
    vapInstance = null;
  }
  containerRef.value.innerHTML = '';

  // 构建融合字段注入 Map (支持 clean tag 与带中括号的 tag 兼容)
  const headData: Record<string, string> = {};
  if (props.dynamicItems) {
    props.dynamicItems.forEach(item => {
      if (item.value) {
        headData[item.key] = item.value;
        headData[`[${item.key}]`] = item.value;
      }
    });
  }

  try {
    vapInstance = new Vap().play({
      container: containerRef.value,
      src: videoUrl,
      config: currentConfig,
      width: currentConfig.info.w,
      height: currentConfig.info.h,
      loop: props.playback.isLoop,
      fps: currentConfig.info.fps || 30,
      ...headData
    });

    if (vapInstance) {
      vapInstance.on('playing', () => {
        emit('update:playback', { isPlaying: true });
      });

      vapInstance.on('pause', () => {
        emit('update:playback', { isPlaying: false });
      });

      vapInstance.on('ended', () => {
        if (!props.playback.isLoop) {
          emit('update:playback', { isPlaying: false });
        }
      });

      vapInstance.on('frame', (frameIndex: number) => {
        const fps = currentConfig.info.fps || 30;
        emit('update:playback', {
          currentFrame: frameIndex,
          currentTime: frameIndex / fps
        });
      });

      // 视口倍速初始化
      const videoElem = containerRef.value.querySelector('video');
      if (videoElem) {
        videoElem.playbackRate = props.playback.speed || 1.0;
      }
    }
  } catch (err) {
    console.error('Failed to start VAP instance:', err);
  }
}

watch(() => props.playback.isPlaying, (playing) => {
  if (!vapInstance) return;
  if (playing) vapInstance.play();
  else vapInstance.pause();
});

watch(() => props.playback.speed, (spd) => {
  const videoElem = containerRef.value?.querySelector('video');
  if (videoElem) {
    videoElem.playbackRate = spd;
  }
});

watch(() => props.playback.isLoop, (loop) => {
  const videoElem = containerRef.value?.querySelector('video');
  if (videoElem) {
    videoElem.loop = loop;
  }
});

watch(() => props.playback.currentFrame, (frame) => {
  const videoElem = containerRef.value?.querySelector('video');
  if (videoElem && props.playback.fps && !props.playback.isPlaying) {
    videoElem.currentTime = frame / props.playback.fps;
  }
});

// 当动态融合参数变更时，热重载 VAP 实例以更新融合文字与贴图
let dynamicDebounce: number | null = null;
watch(() => props.dynamicItems, () => {
  if (dynamicDebounce) clearTimeout(dynamicDebounce);
  dynamicDebounce = window.setTimeout(() => {
    playVapInstance();
  }, 300);
}, { deep: true });

onMounted(() => {
  initVap();
});

onBeforeUnmount(() => {
  if (dynamicDebounce) clearTimeout(dynamicDebounce);
  if (vapInstance) {
    try {
      vapInstance.destroy();
    } catch (_) {}
    vapInstance = null;
  }
  if (videoUrl) {
    URL.revokeObjectURL(videoUrl);
    videoUrl = '';
  }
});
</script>
