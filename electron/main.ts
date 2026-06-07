// electron/main.ts
// Main Process — Node.js environment
// ห้าม import Vue, CSS, หรือ browser API ใดๆ ทั้งสิ้น

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { saveSession, loadSession, closeDb, getSessionByPdfPath, createSession, insertPomodoroLog } from './database'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
  const buffer   = Array.from(fs.readFileSync(filePath))
  const fileName = filePath.split(/[\\/]/).pop() ?? 'document.pdf'

  return { buffer, fileName, filePath }  // ← return filePath ด้วย
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

ipcMain.handle('session:save', (_event, data) => {
  try {
    saveSession(data)
    return { success: true }
  } catch (e) {
    console.error('[DB] saveSession error:', e)
    return { success: false }
  }
})

ipcMain.handle('session:load', () => {
  try {
    return loadSession()
  } catch (e) {
    console.error('[DB] loadSession error:', e)
    return null
  }
})

// ── Flush DB เมื่อ app กำลังปิด ──────────────────────
// before-quit fires ก่อนที่ window จะถูก destroy
app.on('before-quit', () => {
  closeDb()
})

// อ่านไฟล์จาก path โดยตรง (สำหรับ session restore)
ipcMain.handle('file:readByPath', (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) return null
    return Array.from(fs.readFileSync(filePath))
  } catch {
    return null
  }
})

ipcMain.handle('session:getByPath', (_event, pdfPath: string) => {
  try {
    return getSessionByPdfPath(pdfPath)
  } catch (e) {
    console.error('[DB] getSessionByPdfPath error:', e)
    return null
  }
})


ipcMain.handle('session:create', (_event, pdfPath: string) => {
  try {
    const sessionId = createSession(pdfPath)
    return { session_id: sessionId }
  } catch (e) {
    console.error('[DB] createSession error:', e)
    return null
  }
})
ipcMain.handle('pomodoro:log', (_event, data: { session_id: number; duration_mins: number }) => {
  try {
    insertPomodoroLog(data.session_id, data.duration_mins)
    return { success: true }
  } catch (e) {
    console.error('[DB] insertPomodoroLog error:', e)
    return { success: false }
  }
})
app.whenReady().then(createWindow)