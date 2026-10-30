<template>
  <div class="w-88 bg-slate-900 border-l border-slate-800 flex flex-col h-full select-none shrink-0 text-slate-200">
    <!-- 顶部标签切换导航 (SVGA 拥有 4 个专业视图，其余格式 2 个视图) -->
    <div class="flex border-b border-slate-800 text-xs font-medium overflow-x-auto shrink-0 bg-slate-900/90 backdrop-blur-sm">
      <button 
        @click="activeTab = 'dynamic'" 
        :class="activeTab === 'dynamic' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/40' : 'text-slate-400 hover:text-slate-200'"
        class="flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
      >
        <Sparkles class="w-3.5 h-3.5" />
        <span>{{ isSvga ? 'API 调试' : `动态替换 (${dynamicItems.length})` }}</span>
      </button>

      <!-- SVGA 专属：内置位图素材库 -->
      <button 
        v-if="isSvga"
        @click="activeTab = 'assets'" 
        :class="activeTab === 'assets' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/40' : 'text-slate-400 hover:text-slate-200'"
        class="flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
      >
        <ImageIcon class="w-3.5 h-3.5" />
        <span>素材库 ({{ dynamicItems.length }})</span>
      </button>

      <button 
        @click="activeTab = 'info'" 
        :class="activeTab === 'info' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/40' : 'text-slate-400 hover:text-slate-200'"
        class="flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
      >
        <Activity class="w-3.5 h-3.5" />
        <span>参数性能</span>
      </button>

      <!-- SVGA 专属：集成代码导出 -->
      <button 
        v-if="isSvga"
        @click="activeTab = 'code'" 
        :class="activeTab === 'code' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/40' : 'text-slate-400 hover:text-slate-200'"
        class="flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
      >
        <Code class="w-3.5 h-3.5" />
        <span>代码集成</span>
      </button>
    </div>

    <!-- 面板内容滚动区 -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      
      <!-- ==================== 1. 动态替换 & API 调试面板 ==================== -->
      <div v-if="activeTab === 'dynamic'" class="space-y-4">
        
        <!-- SVGA 官方核心 API 调试卡片 (仅 SVGA 展示) -->
        <div v-if="isSvga" class="p-3 bg-slate-950/70 border border-indigo-500/30 rounded-xl space-y-3 text-xs shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span class="font-semibold text-indigo-300 flex items-center gap-1.5">
              <Sliders class="w-3.5 h-3.5 text-indigo-400" />
              <span>官方播放器核心 API 调试</span>
            </span>
            <span class="text-[10px] text-slate-500 font-mono">SVGA.Player</span>
          </div>

          <!-- API 1: setContentMode -->
          <div class="space-y-1.5">
            <div class="flex justify-between items-center text-slate-400 text-[11px]">
              <span class="font-mono text-slate-300">setContentMode(mode)</span>
              <span class="text-slate-500 text-[10px]">缩放对齐</span>
            </div>
            <div class="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button 
                v-for="mode in (['AspectFit', 'AspectFill', 'Fill'] as const)" 
                :key="mode"
                @click="updateContentMode(mode)"
                :class="svgaOpts.contentMode === mode ? 'bg-indigo-600 text-white font-medium shadow' : 'text-slate-400 hover:text-slate-200'"
                class="py-1 rounded text-center text-[11px] transition-colors cursor-pointer"
              >
                {{ mode }}
              </button>
            </div>
          </div>

          <!-- API 2: clearsAfterStop -->
          <div class="flex items-center justify-between text-[11px] pt-1">
            <div>
              <span class="font-mono text-slate-300 block">clearsAfterStop</span>
              <span class="text-[10px] text-slate-500">停止时是否清空画布（留存最后一帧）</span>
            </div>
            <button 
              @click="updateClearsAfterStop(!svgaOpts.clearsAfterStop)"
              :class="svgaOpts.clearsAfterStop ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'"
              class="px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer"
            >
              {{ svgaOpts.clearsAfterStop ? 'true (清屏)' : 'false (留存)' }}
            </button>
          </div>

          <!-- API 3: startAnimationWithRange -->
          <div class="space-y-2 pt-1 border-t border-slate-800/60">
            <div class="flex justify-between items-center text-slate-400 text-[11px]">
              <span class="font-mono text-slate-300">startAnimationWithRange(...)</span>
              <span class="text-indigo-400 text-[10px]">区间定帧播放</span>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span class="text-slate-500 block text-[10px] mb-1">起始帧 location</span>
                <input 
                  type="number" 
                  min="0" 
                  :max="Math.max(playback.totalFrames - 1, 0)"
                  v-model.number="rangeLocation"
                  class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs font-mono outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <span class="text-slate-500 block text-[10px] mb-1">帧长度 length</span>
                <input 
                  type="number" 
                  min="1" 
                  :max="playback.totalFrames"
                  v-model.number="rangeLength"
                  class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs font-mono outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div class="flex gap-2">
              <button 
                @click="applyRangePlay"
                class="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-sm"
              >
                <Play class="w-3 h-3 fill-white" />
                <span>播放区间 [{{ rangeLocation }} ~ {{ rangeLocation + rangeLength }}F]</span>
              </button>
              <button 
                v-if="svgaOpts.rangeEnabled"
                @click="resetRangePlay"
                class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                title="恢复全量循环播放"
              >
                <RotateCcw class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <!-- 语聊房预设测试头像快捷选择 (仅 SVGA 或具备图片替换的动效) -->
        <div v-if="isSvga && dynamicItems.some(i => i.type === 'image')" class="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-xs">
          <div class="flex items-center justify-between text-slate-300">
            <span class="font-medium text-slate-200">语聊房测试头像一键替换 (API: setImage)</span>
            <span class="text-[10px] text-slate-500">点击立即生效</span>
          </div>
          <div class="grid grid-cols-5 gap-1.5">
            <button 
              v-for="avatar in presetAvatars" 
              :key="avatar.name"
              @click="applyPresetAvatar(avatar.url)"
              class="flex flex-col items-center gap-1 p-1 bg-slate-900 hover:bg-indigo-950/60 hover:border-indigo-500/50 border border-slate-800 rounded-lg transition-all group cursor-pointer"
              :title="avatar.name"
            >
              <img :src="avatar.url" class="w-7 h-7 rounded-full object-cover group-hover:scale-105 transition-transform" />
              <span class="text-[9px] text-slate-400 group-hover:text-indigo-300 truncate w-full text-center">{{ avatar.name }}</span>
            </button>
          </div>
        </div>

        <!-- 搜索与筛选 Key 过滤条 (当图层较多时极大方便定位) -->
        <div v-if="dynamicItems.length > 3" class="relative">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="搜索图层 Key 属性..." 
            class="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-3 pr-8 py-1.5 text-slate-200 text-xs focus:border-indigo-500 outline-none"
          />
          <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-2.5 top-2 text-slate-500 hover:text-white text-xs">✕</button>
        </div>

        <!-- 空图层提示 -->
        <div v-if="dynamicItems.length === 0" class="text-center py-12 text-slate-500 text-xs">
          <Layers class="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p>当前动效未检测到可动态替换的图片或文本图层。</p>
        </div>

        <!-- 动态项列表 -->
        <div 
          v-for="(item, idx) in filteredDynamicItems" 
          :key="item.key" 
          class="p-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 rounded-xl space-y-2 text-xs transition-colors"
        >
          <div class="flex items-center justify-between text-slate-300">
            <div class="flex items-center gap-1.5 max-w-[70%]">
              <span class="font-mono text-indigo-300 font-medium truncate" :title="item.key">{{ item.key }}</span>
              <span v-if="item.imageWidth" class="text-[10px] text-slate-500 font-mono">({{ item.imageWidth }}×{{ item.imageHeight }})</span>
            </div>
            
            <div class="flex items-center gap-1.5">
              <span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-indigo-400 uppercase font-mono">{{ item.type }}</span>
              <!-- 恢复原图按钮 (当有替换值时显示) -->
              <button 
                v-if="item.value"
                @click="resetItem(idx)"
                class="text-[10px] text-slate-400 hover:text-amber-400 underline cursor-pointer"
                title="恢复为 SVGA 原始内置位图"
              >
                恢复默认
              </button>
            </div>
          </div>

          <!-- 文本类型替换 -->
          <div v-if="item.type === 'text'" class="space-y-2">
            <input 
              type="text" 
              :value="item.value" 
              @input="onTextChange(idx, ($event.target as HTMLInputElement).value)"
              placeholder="输入动态文本内容 (setText)..." 
              class="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:border-indigo-500 outline-none"
            />
            
            <!-- 文本高级参数 (字号与字体颜色) -->
            <div class="flex items-center gap-2 text-[11px] text-slate-400">
              <div class="flex items-center gap-1 flex-1">
                <span>字号:</span>
                <select 
                  :value="item.fontSize || '24px'" 
                  @change="onFontSizeChange(idx, ($event.target as HTMLSelectElement).value)"
                  class="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 text-xs font-mono outline-none"
                >
                  <option value="16px">16px</option>
                  <option value="20px">20px</option>
                  <option value="24px">24px</option>
                  <option value="32px">32px</option>
                  <option value="40px">40px</option>
                </select>
              </div>

              <div class="flex items-center gap-1">
                <span>颜色:</span>
                <input 
                  type="color" 
                  :value="item.fontColor || '#ffffff'" 
                  @input="onFontColorChange(idx, ($event.target as HTMLInputElement).value)"
                  class="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer p-0"
                />
              </div>
            </div>
          </div>

          <!-- 图片类型替换 -->
          <div v-else-if="item.type === 'image'" class="flex items-center gap-2.5">
            <!-- 原图缩略图 -->
            <div 
              class="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0 relative group/thumb cursor-pointer shadow-inner"
              :title="item.value ? '已替换 (点击查看原图)' : '原图缩略预览'"
              @click="previewImage(item.value || item.placeholderUrl)"
            >
              <div class="absolute inset-0 bg-repeat opacity-15" style="background-image: linear-gradient(45deg, #475569 25%, transparent 25%), linear-gradient(-45deg, #475569 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #475569 75%), linear-gradient(-45deg, transparent 75%, #475569 75%); background-size: 8px 8px;"></div>
              <img v-if="item.value || item.placeholderUrl" :src="item.value || item.placeholderUrl" class="w-full h-full object-contain relative z-10" />
              <ImageIcon v-else class="w-4 h-4 text-slate-500 relative z-10" />
              <div v-if="item.value" class="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 z-20"></div>
            </div>

            <!-- 操作选项 -->
            <div class="flex-1 space-y-1.5">
              <div class="flex gap-1.5">
                <!-- 上传本地测试图 -->
                <label class="flex-1 cursor-pointer">
                  <span class="inline-block w-full text-center py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-lg transition-colors text-[11px] font-medium">
                    {{ item.value ? '更改替换图' : '选择替换图' }}
                  </span>
                  <input type="file" accept="image/*" class="hidden" @change="onImageSelected($event, idx)" />
                </label>

                <!-- 复制 Key -->
                <button 
                  @click="copyText(item.key)" 
                  class="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-[11px] transition-colors cursor-pointer"
                  title="复制 ImageKey 供开发代码使用"
                >
                  <Copy class="w-3 h-3" />
                </button>
              </div>

              <!-- 状态提示 -->
              <div class="text-[10px] text-slate-500 flex items-center justify-between">
                <span>{{ item.value ? '当前使用: 自定义替换位图' : '当前使用: SVGA 原包内置位图' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== 2. SVGA 内置素材库展示面板 ==================== -->
      <div v-if="activeTab === 'assets'" class="space-y-3">
        <div class="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
          <span>解包提取位图素材总数</span>
          <span class="font-mono text-indigo-400 font-semibold">{{ dynamicItems.length }} 个资源</span>
        </div>

        <div class="grid grid-cols-2 gap-2.5">
          <div 
            v-for="(item, idx) in dynamicItems" 
            :key="item.key"
            class="p-2 bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 rounded-xl flex flex-col justify-between group transition-all"
          >
            <!-- 缩略预览 -->
            <div class="w-full aspect-square bg-slate-900 rounded-lg border border-slate-800/80 relative overflow-hidden flex items-center justify-center p-2 mb-2">
              <div class="absolute inset-0 bg-repeat opacity-15" style="background-image: linear-gradient(45deg, #475569 25%, transparent 25%), linear-gradient(-45deg, #475569 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #475569 75%), linear-gradient(-45deg, transparent 75%, #475569 75%); background-size: 8px 8px;"></div>
              <img :src="item.placeholderUrl" class="w-full h-full object-contain relative z-10 group-hover:scale-105 transition-transform" />
            </div>

            <!-- 属性信息 -->
            <div class="space-y-1">
              <div class="font-mono text-xs text-slate-200 font-medium truncate" :title="item.key">
                {{ item.key }}
              </div>
              <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{{ item.imageWidth ? `${item.imageWidth}×${item.imageHeight}` : '矢量/未知' }}</span>
                <span class="text-slate-500">PNG</span>
              </div>

              <!-- 快捷操作栏 -->
              <div class="flex gap-1 pt-1 border-t border-slate-900">
                <button 
                  @click="copyText(item.key)"
                  class="flex-1 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="复制 Key"
                >
                  <Copy class="w-2.5 h-2.5" />
                  <span>复制Key</span>
                </button>
                <button 
                  @click="downloadImage(item.placeholderUrl!, `${item.key}.png`)"
                  class="flex-1 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-indigo-300 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="下载原图 PNG"
                >
                  <Download class="w-2.5 h-2.5" />
                  <span>下载</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== 3. 性能指标与动效参数面板 ==================== -->
      <div v-if="activeTab === 'info'" class="space-y-3 text-xs">
        <!-- 文件属性卡片 -->
        <div class="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <h4 class="font-semibold text-slate-300 border-b border-slate-800/80 pb-1.5 flex items-center gap-1.5">
            <FileText class="w-3.5 h-3.5 text-indigo-400" />
            <span>文件结构与规范</span>
          </h4>
          <div class="flex justify-between text-slate-400">
            <span>文件格式</span>
            <span class="text-white font-mono uppercase">{{ info.type }}</span>
          </div>
          <div v-if="info.version" class="flex justify-between text-slate-400">
            <span>规范版本</span>
            <span class="text-amber-400 font-mono font-semibold">{{ info.version }} ({{ info.version.startsWith('1') ? 'Zip 容器' : 'Protobuf 协议' }})</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>原始画布尺寸</span>
            <span class="text-white font-mono">{{ info.width || '-' }} × {{ info.height || '-' }} px</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>文件包体积</span>
            <span class="text-white font-mono">{{ formatFileSize(info.size) }}</span>
          </div>
        </div>

        <!-- 动效指标卡片 -->
        <div class="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <h4 class="font-semibold text-slate-300 border-b border-slate-800/80 pb-1.5 flex items-center gap-1.5">
            <Activity class="w-3.5 h-3.5 text-emerald-400" />
            <span>运行时动效指标</span>
          </h4>
          <div class="flex justify-between text-slate-400">
            <span>标称帧率</span>
            <span class="text-emerald-400 font-mono">{{ Math.round(info.fps || 30) }} FPS</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>总帧数 / 动画时长</span>
            <span class="text-white font-mono">{{ playback.totalFrames }} 帧 / {{ playback.duration.toFixed(2) }}s</span>
          </div>
          <div v-if="info.spritesCount !== undefined" class="flex justify-between text-slate-400">
            <span>精灵/图层总数</span>
            <span class="text-white font-mono">{{ info.spritesCount }} 个</span>
          </div>
          <div v-if="info.audiosCount !== undefined" class="flex justify-between text-slate-400">
            <span>内嵌音频轨道</span>
            <span class="text-white font-mono">{{ info.audiosCount > 0 ? `${info.audiosCount} 条音轨` : '无' }}</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>内存开销预估</span>
            <span class="text-indigo-300 font-mono">{{ estimateMemory(info.width, info.height, playback.totalFrames) }}</span>
          </div>
        </div>

        <!-- 跨端兼容性与落地建议 -->
        <div class="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <h4 class="font-semibold text-slate-300 border-b border-slate-800/80 pb-1.5">跨端兼容性矩阵</h4>
          <div class="grid grid-cols-2 gap-1.5 text-[11px]">
            <div class="bg-slate-900 p-1.5 rounded flex items-center justify-between">
              <span class="text-slate-400">Web Canvas</span>
              <span class="text-emerald-400">✓ 支持</span>
            </div>
            <div class="bg-slate-900 p-1.5 rounded flex items-center justify-between">
              <span class="text-slate-400">Android</span>
              <span class="text-emerald-400">✓ 支持</span>
            </div>
            <div class="bg-slate-900 p-1.5 rounded flex items-center justify-between">
              <span class="text-slate-400">iOS (ObjC/Swift)</span>
              <span class="text-emerald-400">✓ 支持</span>
            </div>
            <div class="bg-slate-900 p-1.5 rounded flex items-center justify-between">
              <span class="text-slate-400">Flutter</span>
              <span class="text-emerald-400">✓ 支持</span>
            </div>
          </div>
        </div>

        <div class="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <h4 class="font-semibold text-slate-300 border-b border-slate-800/80 pb-1.5">语聊房落地场景建议</h4>
          <p class="text-[11px] text-slate-400 leading-relaxed">{{ getSceneSuggestion(info.type) }}</p>
        </div>
      </div>

      <!-- ==================== 4. 官方 API 代码集成生成器 ==================== -->
      <div v-if="activeTab === 'code'" class="space-y-3 text-xs">
        <div class="flex items-center justify-between">
          <div class="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button 
              @click="codeType = 'modern'"
              :class="codeType === 'modern' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
              class="px-2 py-0.5 rounded transition-colors cursor-pointer"
            >
              svga-web (现代多线程/推荐)
            </button>
            <button 
              @click="codeType = 'classic'"
              :class="codeType === 'classic' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'"
              class="px-2 py-0.5 rounded transition-colors cursor-pointer"
            >
              经典 svgaplayerweb
            </button>
          </div>

          <button 
            @click="copyCode" 
            class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
          >
            <Check v-if="copied" class="w-3.5 h-3.5" />
            <Copy v-else class="w-3.5 h-3.5" />
            <span>{{ copied ? '已复制代码' : '复制代码' }}</span>
          </button>
        </div>

        <pre class="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed whitespace-pre">{{ generatedCode }}</pre>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Sparkles, 
  Activity, 
  FileText, 
  Layers, 
  Image as ImageIcon, 
  Sliders, 
  Copy, 
  Check, 
  Download, 
  Play, 
  RotateCcw, 
  Code 
} from 'lucide-vue-next';
import type { AnimationInfo, PlaybackState, DynamicReplaceItem, SvgaApiOptions } from '../types';
import { formatFileSize } from '../utils/detector';

const props = defineProps<{
  info: AnimationInfo;
  playback: PlaybackState;
  dynamicItems: DynamicReplaceItem[];
  svgaOptions?: SvgaApiOptions;
}>();

const emit = defineEmits<{
  (e: 'update:dynamicItems', items: DynamicReplaceItem[]): void;
  (e: 'update:svgaOptions', options: Partial<SvgaApiOptions>): void;
  (e: 'trigger-range-play'): void;
}>();

const activeTab = ref<'dynamic' | 'assets' | 'info' | 'code'>('dynamic');
const searchQuery = ref('');
const copied = ref(false);
const codeType = ref<'modern' | 'classic'>('modern');

const isSvga = computed(() => props.info.type === 'svga');

const svgaOpts = computed<SvgaApiOptions>(() => props.svgaOptions || {
  contentMode: 'AspectFit',
  clearsAfterStop: false,
  reverse: false,
  rangeEnabled: false,
  rangeLocation: 0,
  rangeLength: 30
});

const rangeLocation = ref<number>(props.svgaOptions?.rangeLocation || 0);
const rangeLength = ref<number>(props.svgaOptions?.rangeLength || Math.min(30, props.playback.totalFrames || 30));

// 过滤图层列表
const filteredDynamicItems = computed(() => {
  if (!searchQuery.value) return props.dynamicItems;
  const q = searchQuery.value.toLowerCase();
  return props.dynamicItems.filter(item => 
    item.key.toLowerCase().includes(q) || item.label.toLowerCase().includes(q)
  );
});

// 5 组精美语聊房预设头像 (以高压缩 SVG DataURL 呈现，免网络依赖)
const presetAvatars = [
  {
    name: '👑 房主',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23f59e0b"/><stop offset="100%" stop-color="%23ea580c"/></linearGradient></defs><circle cx="40" cy="40" r="38" fill="url(%23g1)"/><text x="40" y="48" font-size="32" text-anchor="middle">👑</text></svg>'
  },
  {
    name: '💎 榜一',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%2338bdf8"/><stop offset="100%" stop-color="%236366f1"/></linearGradient></defs><circle cx="40" cy="40" r="38" fill="url(%23g2)"/><text x="40" y="48" font-size="32" text-anchor="middle">💎</text></svg>'
  },
  {
    name: '🌟 主播',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23ec4899"/><stop offset="100%" stop-color="%238b5cf6"/></linearGradient></defs><circle cx="40" cy="40" r="38" fill="url(%23g3)"/><text x="40" y="48" font-size="32" text-anchor="middle">🌟</text></svg>'
  },
  {
    name: '💖 贵宾',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%2310b981"/><stop offset="100%" stop-color="%2306b6d4"/></linearGradient></defs><circle cx="40" cy="40" r="38" fill="url(%23g4)"/><text x="40" y="48" font-size="32" text-anchor="middle">💖</text></svg>'
  },
  {
    name: '🎁 礼物',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><defs><linearGradient id="g5" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23f43f5e"/><stop offset="100%" stop-color="%23f59e0b"/></linearGradient></defs><circle cx="40" cy="40" r="38" fill="url(%23g5)"/><text x="40" y="48" font-size="32" text-anchor="middle">🎁</text></svg>'
  }
];

function updateContentMode(mode: 'AspectFit' | 'AspectFill' | 'Fill') {
  emit('update:svgaOptions', { contentMode: mode });
}

function updateClearsAfterStop(val: boolean) {
  emit('update:svgaOptions', { clearsAfterStop: val });
}

function applyRangePlay() {
  emit('update:svgaOptions', {
    rangeEnabled: true,
    rangeLocation: rangeLocation.value,
    rangeLength: rangeLength.value
  });
  emit('trigger-range-play');
}

function resetRangePlay() {
  emit('update:svgaOptions', {
    rangeEnabled: false
  });
  emit('trigger-range-play');
}

function applyPresetAvatar(dataUrl: string) {
  const firstImageItemIdx = props.dynamicItems.findIndex(i => i.type === 'image');
  if (firstImageItemIdx >= 0) {
    const newItems = [...props.dynamicItems];
    newItems[firstImageItemIdx] = {
      ...newItems[firstImageItemIdx],
      value: dataUrl
    };
    emit('update:dynamicItems', newItems);
  }
}

function onTextChange(index: number, val: string) {
  const newItems = [...props.dynamicItems];
  newItems[index] = { ...newItems[index], value: val };
  emit('update:dynamicItems', newItems);
}

function onFontSizeChange(index: number, size: string) {
  const newItems = [...props.dynamicItems];
  newItems[index] = { ...newItems[index], fontSize: size };
  emit('update:dynamicItems', newItems);
}

function onFontColorChange(index: number, color: string) {
  const newItems = [...props.dynamicItems];
  newItems[index] = { ...newItems[index], fontColor: color };
  emit('update:dynamicItems', newItems);
}

function resetItem(index: number) {
  const newItems = [...props.dynamicItems];
  newItems[index] = { ...newItems[index], value: '' };
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

function previewImage(url?: string) {
  if (!url) return;
  const w = window.open('');
  if (w) {
    w.document.write(`<body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${url}" style="max-width:90%;max-height:90%;object-contain;box-shadow:0 10px 30px rgba(0,0,0,0.5);border-radius:12px;"/></body>`);
  }
}

function downloadImage(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function copyText(str: string) {
  navigator.clipboard.writeText(str);
}

function copyCode() {
  navigator.clipboard.writeText(generatedCode.value).then(() => {
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  });
}

const generatedCode = computed(() => {
  const replacedImages = props.dynamicItems.filter(i => i.type === 'image' && i.value);
  const replacedTexts = props.dynamicItems.filter(i => i.type === 'text' && i.value);

  if (codeType.value === 'modern') {
    return `// 现代 Web 推荐方案: svga-web (多线程解码/OffscreenCanvas/原生Audio)
// 安装: npm i svga-web
import { Downloader, Parser, Player } from 'svga-web';

// 1. 初始化 Player 绑定 HTML5 Canvas
const canvas = document.getElementById('myCanvas');
const player = new Player(canvas);
const downloader = new Downloader();
const parser = new Parser();

// 2. 配置播放参数
player.set({
  loop: ${props.playback.isLoop ? 'true' : '1'}, // 循环次数或 boolean
  fillMode: '${svgaOpts.value.clearsAfterStop ? 'backwards' : 'forwards'}', // 清屏或留存最后一帧
  playMode: '${svgaOpts.value.reverse ? 'fallbacks' : 'forwards'}', // 倒序或正序播放
  ${svgaOpts.value.rangeEnabled ? `startFrame: ${svgaOpts.value.rangeLocation},\n  endFrame: ${svgaOpts.value.rangeLocation + svgaOpts.value.rangeLength},` : ''}
});

// 3. 异步下载与多线程解析
const fileData = await downloader.get('./${props.info.name || 'animation.svga'}');
const svgaData = await parser.do(fileData);
${replacedImages.length > 0 ? '\n// 4. 动态图片替换 (如用户头像)\n' + replacedImages.map(i => `const img_${i.key} = new Image();\nimg_${i.key}.src = '${i.value.startsWith('data:') ? '[Base64/URL 图片]' : i.value}';\nsvgaData.dynamicElements['${i.key}'] = { source: img_${i.key}, fit: 'contain' };`).join('\n') : ''}
${replacedTexts.length > 0 ? '\n// 5. 动态文本注入 (通过离屏 Canvas 绘制)\n' + replacedTexts.map(i => `const textCanvas_${i.key} = document.createElement('canvas');
const ctx_${i.key} = textCanvas_${i.key}.getContext('2d');
textCanvas_${i.key}.width = 200; textCanvas_${i.key}.height = 50;
ctx_${i.key}.font = '${i.fontSize || '24px'} Arial';
ctx_${i.key}.fillStyle = '${i.fontColor || '#ffffff'}';
ctx_${i.key}.textAlign = 'center'; ctx_${i.key}.textBaseline = 'middle';
ctx_${i.key}.fillText('${i.value}', 100, 25);
svgaData.dynamicElements['${i.key}'] = { source: textCanvas_${i.key}, fit: 'contain' };`).join('\n') : ''}

// 6. 挂载数据并启动播放
await player.mount(svgaData);
player.start();`;
  }

  return `// 经典方案: svgaplayerweb
// 安装: npm i svgaplayerweb
import SVGA from 'svgaplayerweb';

// 1. 初始化 Player 并挂载到容器
const container = document.getElementById('svgaContainer');
const player = new SVGA.Player(container);
const parser = new SVGA.Parser();

// 2. 配置播放模式与清屏策略
player.loops = ${props.playback.isLoop ? 0 : 1}; // 0 为无限循环
player.clearsAfterStop = ${svgaOpts.value.clearsAfterStop};
player.setContentMode('${svgaOpts.value.contentMode}');

// 3. 解析与装配动效实体
parser.load('${props.info.name}', (videoItem) => {
  player.setVideoItem(videoItem);
${replacedImages.length > 0 ? '\n  // 4. 动态图片替换 (setImage)\n' + replacedImages.map(i => `  player.setImage('${i.value.startsWith('data:') ? '[Base64/URL 图片]' : i.value}', '${i.key}');`).join('\n') : ''}
${replacedTexts.length > 0 ? '\n  // 5. 动态文本注入 (setText)\n' + replacedTexts.map(i => `  player.setText({
    text: '${i.value}',
    size: '${i.fontSize || '24px'}',
    color: '${i.fontColor || '#ffffff'}',
    family: 'Arial'
  }, '${i.key}');`).join('\n') : ''}
${svgaOpts.value.rangeEnabled ? `\n  // 6. 区间定帧播放 (startAnimationWithRange)\n  player.startAnimationWithRange({ location: ${svgaOpts.value.rangeLocation}, length: ${svgaOpts.value.rangeLength} }, ${svgaOpts.value.reverse});` : `\n  // 6. 启动播放\n  player.startAnimation(${svgaOpts.value.reverse});`}
}, (error) => {
  console.error('SVGA 加载失败:', error);
});`;
});

function estimateMemory(width?: number, height?: number, frames?: number): string {
  if (!width || !height || !frames) return '约 5 ~ 15 MB';
  // 粗略估计 RGBA 解码后显存峰值
  const bytesPerFrame = (width * height * 4);
  const estMb = (bytesPerFrame * Math.min(frames, 30)) / (1024 * 1024);
  return `约 ${(estMb * 0.4).toFixed(1)} ~ ${(estMb * 0.8).toFixed(1)} MB (RGBA)`;
}

function getSceneSuggestion(type: string): string {
  switch (type) {
    case 'pag': return '进场特效、中高级连送礼物、交互UI。原生占位替换、自适应跳帧与体积优势极高。';
    case 'vap': return '顶级全屏复杂3D大礼物、华丽特效。上下/左右透明分割硬解，极低CPU/GPU开销。';
    case 'svga': return '老项目兼容、礼物动效。支持完整的动态位图替换 (setImage) 与文本注入 (setText)，适合语聊房多麦位头像替换动效。';
    case 'lottie': return 'UI微动效、功能引导图标、纯矢量连送按钮点赞动效。复杂礼物性能易劣化。';
    case 'spine': return '麦位虚拟形象、说话嘴型/表情同步、互动小宠物。骨骼换皮换装原生支持。';
    case 'image': return '公屏表情包、低频点赞反馈、小徽章动画。';
    case 'spritesheet': return '游戏连击连送Combo、轻量粒子合批、高性能定宽帧序列动画。';
    default: return '通用多媒体动效。';
  }
}
</script>