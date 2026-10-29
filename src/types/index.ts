export type AnimationType = 
  | 'pag'
  | 'vap'
  | 'svga'
  | 'lottie'
  | 'spine'
  | 'image'      // APNG, WebP, GIF
  | 'spritesheet'// 雪碧图 / 帧序列图
  | 'unknown';

export interface AnimationInfo {
  name: string;
  type: AnimationType;
  size: number;
  width?: number;
  height?: number;
  duration?: number; // 秒
  totalFrames?: number;
  fps?: number;
}

export interface DynamicReplaceItem {
  key: string;
  type: 'text' | 'image';
  label: string;
  value: string; // 文本内容或图片DataURL/URL
  placeholderUrl?: string; // 原始图
}

export interface PlaybackState {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  currentTime: number; // 秒
  duration: number; // 秒
  fps: number;
  speed: number;
  isLoop: boolean;
  zoom: number; // 缩放比例
}

export interface SpritesheetConfig {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  totalFrames: number;
  fps: number;
}

