import type { AnimationType } from '../types';

export function detectFileType(fileName: string, mimeType?: string): AnimationType {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  if (ext === 'pag') return 'pag';
  if (ext === 'svga') return 'svga';
  if (ext === 'json') return 'lottie'; // 大多数情况下为 lottie json，亦可进一步检测内容
  if (ext === 'mp4') return 'vap'; // YY-EVA/VAP/AlphaPlayer MP4
  if (['png', 'apng', 'webp', 'gif'].includes(ext || '')) return 'image';
  if (ext === 'zip') return 'spine'; // Spine 打包 atlas + skel + png
  
  return 'unknown';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

