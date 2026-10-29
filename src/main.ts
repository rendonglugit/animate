import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import JSZip from 'jszip'

// 全局 Polyfill JSZip 与 JSZipUtils，确保 svgaplayerweb 无论在 1.0(Zip) 还是 2.0(Protobuf) 下均能本地安全解析
if (typeof window !== 'undefined') {
  (window as any).JSZip = JSZip;
  if (!(window as any).JSZipUtils) {
    (window as any).JSZipUtils = {
      getBinaryContent: (url: string | ArrayBuffer | Blob, cb: (err: any, data?: ArrayBuffer) => void) => {
        if (url instanceof ArrayBuffer) {
          cb(null, url);
          return;
        }
        if (url instanceof Blob) {
          url.arrayBuffer()
            .then((buf) => cb(null, buf))
            .catch((err) => cb(err));
          return;
        }
        fetch(url)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status} when fetching ${url}`);
            return res.arrayBuffer();
          })
          .then((buffer) => cb(null, buffer))
          .catch((err) => cb(err));
      }
    };
  }
}

createApp(App).mount('#app')
