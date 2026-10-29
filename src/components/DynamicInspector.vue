<template>
  <div class="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full select-none shrink-0">
    <!-- 标签切换 -->
    <div class="flex border-b border-slate-800 text-xs font-medium">
      <button 
        @click="activeTab = 'dynamic'" 
        :class="activeTab === 'dynamic' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/40' : 'text-slate-400 hover:text-slate-200'"
        class="flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors"
      >
        <Sparkles class="w-3.5 h-3.5" />
        <span>动态替换 ({{ dynamicItems.length }})</span>
      </button>

      <button 
        @click="activeTab = 'info'" 
        :class="activeTab === 'info' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/40' : 'text-slate-400 hover:text-slate-200'"
        class="flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors"
      >
        <Activity class="w-3.5 h-3.5" />
        <span>性能与参数</span>
      </button>
    </div>

    <!-- 动态替换面板 -->
    <div v-if="activeTab === 'dynamic'" class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-if="dynamicItems.length === 0" class="text-center py-12 text-slate-500 text-xs">
        <Layers class="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <p>当前动效未检测到可编辑图层或无需动态替换。</p>
      </div>

      <div v-for="(item, idx) in dynamicItems" :key="item.key" class="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-xs">
        <div class="flex items-center justify-between text-slate-300">
          <span class="font-medium text-slate-200 truncate pr-2">{{ item.label }}</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-indigo-400 uppercase font-mono">{{ item.type }}</span>
        </div>

        <!-- 文本类型替换 -->
        <div v-if="item.type === 'text'">
          <input 
            type="text" 
            :value="item.value" 
            @input="onTextChange(idx, ($event.target as HTMLInputElement).value)"
            placeholder="输入替换文字..." 
            class="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:border-indigo-500 outline-none"
          />
        </div>

        <!-- 图片类型替换 -->
        <div v-else-if="item.type === 'image'" class="flex items-center gap-2">
          <!-- 图片缩略图 -->
          <div class="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
            <img v-if="item.value || item.placeholderUrl" :src="item.value || item.placeholderUrl" class="w-full h-full object-cover" />
            <ImageIcon v-else class="w-4 h-4 text-slate-500" />
          </div>

          <!-- 上传本地测试图 -->
          <label class="flex-1 cursor-pointer">
            <span class="inline-block w-full text-center py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-[11px]">
              选择头像/图片
            </span>
            <input type="file" accept="image/*" class="hidden" @change="onImageSelected($event, idx)" />
          </label>
        </div>
      </div>
    </div>

    <!-- 性能与动效参数 -->
    <div v-if="activeTab === 'info'" class="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
      <div class="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
        <h4 class="font-semibold text-slate-300 border-b border-slate-800/80 pb-1.5 flex items-center gap-1.5">
          <FileText class="w-3.5 h-3.5 text-indigo-400" />
          <span>文件属性</span>
        </h4>
        <div class="flex justify-between text-slate-400">
          <span>文件格式</span>
          <span class="text-white font-mono uppercase">{{ info.type }}</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>分辨率尺寸</span>
          <span class="text-white font-mono">{{ info.width || '-' }} x {{ info.height || '-' }} px</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>文件大小</span>
          <span class="text-white font-mono">{{ formatFileSize(info.size) }}</span>
        </div>
      </div>

      <div class="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
        <h4 class="font-semibold text-slate-300 border-b border-slate-800/80 pb-1.5 flex items-center gap-1.5">
          <Activity class="w-3.5 h-3.5 text-emerald-400" />
          <span>动效指标</span>
        </h4>
        <div class="flex justify-between text-slate-400">
          <span>标称帧率</span>
          <span class="text-emerald-400 font-mono">{{ Math.round(info.fps || 30) }} FPS</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>总帧数 / 时长</span>
          <span class="text-white font-mono">{{ playback.totalFrames }} 帧 / {{ playback.duration.toFixed(2) }}s</span>
        </div>
      </div>

      <div class="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
        <h4 class="font-semibold text-slate-300 border-b border-slate-800/80 pb-1.5">语聊房建议落地场景</h4>
        <p class="text-[11px] text-slate-400 leading-relaxed">{{ getSceneSuggestion(info.type) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Sparkles, Activity, FileText, Layers, Image as ImageIcon } from 'lucide-vue-next';
import type { AnimationInfo, PlaybackState, DynamicReplaceItem } from '../types';
import { formatFileSize } from '../utils/detector';

const props = defineProps<{
  info: AnimationInfo;
  playback: PlaybackState;
  dynamicItems: DynamicReplaceItem[];
}>();

const emit = defineEmits<{
  (e: 'update:dynamicItems', items: DynamicReplaceItem[]): void;
}>();

const activeTab = ref<'dynamic' | 'info'>('dynamic');

function onTextChange(index: number, val: string) {
  const newItems = [...props.dynamicItems];
  newItems[index] = { ...newItems[index], value: val };
  emit('update:dynamicItems', newItems);
}

function onImageSelected(e: Event, index: number) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (uploadEvent) => {
    const newItems = [...props.dynamicItems];
    newItems[index] = { ...newItems[index], value: uploadEvent.target?.result as string };
    emit('update:dynamicItems', newItems);
  };
  reader.readAsDataURL(file);
  target.value = '';
}

function getSceneSuggestion(type: string): string {
  switch (type) {
    case 'pag': return '进场特效、中高级连送礼物、交互UI。原生占位替换、自适应跳帧与体积优势极高。';
    case 'vap': return '顶级全屏复杂3D大礼物、华丽特效。上下/左右透明分割硬解，极低CPU/GPU开销。';
    case 'svga': return '老项目兼容、中小礼物动效。已停更，新项目建议优先 PAG 或 EVA/VAP。';
    case 'lottie': return 'UI微动效、功能引导图标、纯矢量连送按钮点赞动效。复杂礼物性能易劣化。';
    case 'spine': return '麦位虚拟形象、说话嘴型/表情同步、互动小宠物。骨骼换皮换装原生支持。';
    case 'image': return '公屏表情包、低频点赞反馈、小徽章动画。';
    case 'spritesheet': return '游戏连击连送Combo、轻量粒子合批、高性能定宽帧序列动画。';
    default: return '通用多媒体动效。';
  }
}
</script>
