# anim-lab

<p align="center">
  <b>A comprehensive, client-side animation preview and dynamic debugging lab tailored for live streaming and audio chat room scenarios.</b>
</p>

<p align="center">
  <a href="https://rendonglugit.github.io/anim-lab/"><img src="https://img.shields.io/badge/Live%20Demo-Online%20Preview-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo" /></a>
</p>

<p align="center">
  🌐 <b>Live Online Demo:</b> <a href="https://rendonglugit.github.io/anim-lab/">https://rendonglugit.github.io/anim-lab/</a>
</p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a> | <b>English</b>
</p>

---

## 🌟 Overview

**anim-lab** is designed to solve common pain points in live streaming and voice chat room development—such as dynamic avatar/nickname replacement verification, alpha channel transparency flaws, frame-stepping diagnostics, and cross-framework comparisons.

All decoders run **100% locally in the browser**. No assets are ever uploaded to third-party servers, ensuring maximum privacy and instant feedback. Hosted on **GitHub Pages (`github.io`)**.

---

## 🚀 Supported Animation Formats

| Format | Web Engine / Technology | Dynamic Replacement (Avatar/Nickname/Skin) | Ideal Voice Room Scenario |
| :--- | :--- | :--- | :--- |
| **PAG** | Tencent `libpag` (WebAssembly) | Native support (text layers, image replacement) | Entrance effects, combo gift anims, interactive UI |
| **YY-EVA (VAP)** | `video-animation-player` | Native fusion injection (sender & receiver avatars/text) | Complex 3D fullscreen big gifts, hardware-decoded effects |
| **SVGA** | `svgaplayerweb` | Native support (`setImage`, `setText`) | Mid-size gift animations, overseas voice rooms |
| **Lottie** | `lottie-web` | JSON text properties & assets replacement | UI micro-interactions, interactive combo buttons |
| **Spine 2D** | Skeleton parser (`JSZip` in-memory unzipping) | Native support (switch Animations & Skins) | Mic seat avatars, lip-sync, interactive virtual pets |
| **Spritesheet** | Custom HTML5 Canvas engine | Grid slice configuration, sequence preview, full sheet grid overlay | Combo multiplier hits, lightweight particle animations |
| **APNG / WebP / GIF** | Native browser hardware decode | Read-only | Chat stream stickers, badges, lightweight medal loops |

---

## ✨ Key Features

1. **Zero-Configuration Drag & Drop**:
   - Automatically detects file extensions and formats (`.pag`, `.svga`, `.json`, `.mp4`, `.png`, `.webp`, `.gif`, and `.zip` for Spine).
2. **Voice Room Simulation Mode**:
   - Preview animations against **Dark**, **Light**, **Alpha Checkered Grid**, or a simulated **8-Seat Voice Chat Room Layout** to inspect viewport occlusion in real conditions.
3. **Frame-Stepping & Quality Assurance**:
   - Precise single-frame stepping (`+1F` / `-1F`) to identify artifact flickers and edge bleeding.
   - Variable playback speed from `0.25x` to `2.0x`.
   - Free viewport zoom (`20%` - `300%`) and 1:1 pixel reset.
4. **Dynamic Inspection Panel**:
   - Automatically detects and lists editable text and image slots for PAG, SVGA, and Lottie.
   - Test custom usernames or upload avatar images on the fly with live updates.
5. **Dedicated Spritesheet Inspector**:
   - Quickly adjust columns, rows, and valid frame counts.
   - View the entire sprite atlas with overlaid numbered grid lines.
6. **Built-in Demos for All Formats**:
   - Bundles authentic samples for PAG, VAP, SVGA, Lottie, Spine 2D, Spritesheets, and WebP for zero-setup 1-click previewing directly from the homepage or top navigation.

---

## 🛠️ Local Development & Build

```bash
# 1. Install dependencies
npm install

# 2. Start local dev server
npm run dev

# 3. Build for production
npm run build
```

---

## 🌐 Deploy to GitHub Pages

This project comes pre-configured with [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. Push this repository to your GitHub `main` branch: `https://github.com/rendonglugit/anim-lab`
2. Go to repository **Settings -> Pages**.
3. Under **Build and deployment -> Source**, select **GitHub Actions**.
4. GitHub will automatically build and deploy your site to [https://rendonglugit.github.io/anim-lab/](https://rendonglugit.github.io/anim-lab/).
