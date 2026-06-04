import { createApp } from 'vue'
import './assets/styles/base.css'
import App from './App.vue'

createApp(App).mount('#app').$nextTick(() => {
  window.ipcRenderer.on('main-process-message', (_event: unknown, message: unknown) => {
    console.log(message)
  })
})