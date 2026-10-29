# anim-lab (全格式动效实验室)

<p align="center">
  <b>专为语聊房/直播场景打造的本地动效即时预览与动态化参数调试平台</b>
</p>

<p align="center">
  <a href="https://rendonglugit.github.io/animate/"><img src="https://img.shields.io/badge/Live%20Demo-在线体验-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo" /></a>
</p>

<p align="center">
  🌐 <b>在线体验地址 (Live Demo):</b> <a href="https://rendonglugit.github.io/animate/">https://rendonglugit.github.io/animate/</a>
</p>

<p align="center">
  <b>简体中文</b> | <a href="./README.md">English</a>
</p>

---

## 🌟 方案介绍

**anim-lab** 专为解决语聊房与直播间动效研发落地过程中的痛点（如头像/昵称动态替换调试、Alpha 透明通道瑕疵、逐帧缺陷排查以及跨动效引擎效果对齐）。

所有解码与渲染完全在**本地浏览器端运行**，不会上传任何动效素材至第三方服务器，保证隐私与极速响应。通过 GitHub Pages 免费托管。

---

## 🚀 支持的动效格式

| 格式 | 解析引擎 / 方案 | 动态元素替换支持 (头像/昵称/换装) | 语聊房典型落地场景 |
| :--- | :--- | :--- | :--- |
| **PAG** | Tencent `libpag` (WebAssembly) | 原生支持（文本图层修改、图片占位图替换） | 进场特效、中高级连送礼物、UI 动效 |
| **YY-EVA (VAP)** | `video-animation-player` | 原生融合注入（发送者/接收者头像与昵称） | 顶级全屏复杂 3D 大礼物、华丽硬解动效 |
| **SVGA** | `svgaplayerweb` | 原生支持（`setImage`、`setText`） | 中小礼物、出海语聊房兼容 |
| **Lottie** | `lottie-web` | 支持（JSON 文本属性、图片 assets 替换） | UI 微动效、连送按钮交互、点赞反馈 |
| **Spine 2D** | 骨骼解析器 (`JSZip` 自动解压) | 支持（动作 Animations、皮肤 Skins 切换） | 麦位虚拟形象、说话嘴型同步、宠物 |
| **雪碧图 (Spritesheet)** | Canvas 定位切分引擎 | 支持自定义行列网格、帧数计算、原图/网格查看 | 连击连送 Combo、游戏化轻量粒子动画 |
| **APNG / WebP / GIF** | 浏览器原生硬解 | 不支持（只读） | 公屏聊天表情包、徽章勋章动效 |

---

## ✨ 核心功能特性

1. **一拖即看 (Zero Config)**：
   - 自动根据文件后缀分流至对应的原生播放引擎。
   - 支持 `.pag`、`.svga`、`.json`、`.mp4`、`.png`、`.webp`、`.gif` 及 `.zip` (Spine 骨骼包)。
2. **语聊房实景模拟**：
   - 支持 4 种背景切换：**深色底**、**浅色底**、**Alpha 透明棋盘格** 以及 **语聊房 8 麦位实景模拟图层**，便于评估大礼物在房间上的覆盖遮挡体验。
3. **逐帧排查与质检**：
   - 逐帧单步前进 / 后退（`+1F` / `-1F`，专为排查动效闪烁、边缘黑边与瑕疵设计）。
   - `0.25x` - `2.0x` 慢速与倍速播放。
   - 视口自由缩放（`20%` - `300%`）与 1:1 复位。
4. **动态参数调试面板**：
   - 自动提取 PAG / SVGA / Lottie 的动态文本与图片占位。
   - 实时输入修改文本、本地选择测试头像并即时重新渲染。
5. **雪碧图专属排查工具**：
   - 快速调节行列数（Cols/Rows）、有效帧数。
   - 一键展开原始雪碧大图并叠加网格辅助线与序号。
6. **内置全格式示例动效 (Built-in Demos)**：
   - 无需自备素材，主页与导航栏内置 PAG、VAP、SVGA、Lottie、Spine、雪碧图与 WebP 全格式官方示例动效，支持一键即时载入体验。

---

## 🛠️ 本地运行与构建

```bash
# 1. 安装依赖
npm install

# 2. 本地开发调试
npm run dev

# 3. 生产环境打包 (输出到 dist/)
npm run build
```

---

## 🌐 部署至 GitHub Pages

项目已内置 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) 自动化流水线：
1. 将当前项目 push 至 GitHub 仓库 `main` 分支：`https://github.com/rendonglugit/animate`
2. 在仓库的 **Settings -> Pages** 中，将 **Build and deployment -> Source** 设置为 **GitHub Actions**。
3. 之后每次 push 都会全自动构建并上线至 [https://rendonglugit.github.io/animate/](https://rendonglugit.github.io/animate/)。
