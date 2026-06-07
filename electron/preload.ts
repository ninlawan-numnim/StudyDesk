import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // Feature 1
  openPdfFile: () => ipcRenderer.invoke('dialog:openPdf'),

  // Feature 2 — Session Recovery 
  saveSession: (data: object) => ipcRenderer.invoke('session:save', data),
  loadSession: ()             => ipcRenderer.invoke('session:load'),
  getByPath: (path: string)   => ipcRenderer.invoke('session:getByPath', path),
  createSession: (path: string) => ipcRenderer.invoke('session:create', path),
  logPomodoro: (data: { session_id: number; duration_mins: number }) =>
  ipcRenderer.invoke('pomodoro:log', data),
  
})