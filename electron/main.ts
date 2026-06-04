// electron/main.ts
// Main Process — Node.js environment
// ห้าม import Vue, CSS, หรือ browser API ใดๆ ทั้งสิ้น

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { app, BrowserWindow, ipcMain, dialog } from 'electron'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

// ─────────────────────────────────────────────────────
// IPC HANDLERS — ต้องอยู่ top level ก่อน app.whenReady()
// เพื่อให้แน่ใจว่า handler ถูก register ก่อน Renderer
// ส่ง invoke มา
// ─────────────────────────────────────────────────────
ipcMain.handle('dialog:openPdf', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Open PDF File',
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
    properties: ['openFile'],
  })

  if (canceled || filePaths.length === 0) return null

  const filePath = filePaths[0]

  // แปลงเป็น number[] เพราะ Buffer serialize ผ่าน IPC ไม่สมบูรณ์
  const buffer = Array.from(fs.readFileSync(filePath))
  const fileName = filePath.split(/[\\/]/).pop() ?? 'document.pdf'

  return { buffer, fileName }
})

// ─────────────────────────────────────────────────────

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)