// src/main.ts
import { createApp } from 'vue'
import './assets/styles/base.css'
import App from './App.vue'


import * as pdfjsLib from 'pdfjs-dist'


// ใช้ ?url เพื่อให้ Vite คืนค่ากลับมาเป็น URL Path ที่ถูกต้อง
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.js?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

createApp(App).mount('#app').$nextTick(() => {
  window.ipcRenderer.on('main-process-message', (_event: unknown, message: unknown) => {
    console.log(message)
  })
})