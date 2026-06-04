<script setup lang="ts">
/**
 * WorkspaceLayout.vue — Root workspace component
 *
 * Feature 1: Integrated Split-Screen Interface
 * SRS-1.1.1: PDF Viewer left pane + Markdown Editor right pane
 * SRS-1.1.2: "Unsupported file format" error on non-PDF
 */
import { ref } from 'vue'
import PdfViewer from './PdfViewer.vue'
import MarkdownEditor from './MarkdownEditor.vue'

const pdfBuffer       = ref<number[] | null>(null)
const pdfFileName     = ref<string>('')
const markdownContent = ref<string>('')
const errorMessage    = ref<string>('')
const currentPage     = ref<number>(1)

let errorTimer: ReturnType<typeof setTimeout> | null = null

function showError(msg: string) {
  errorMessage.value = msg
  if (errorTimer) clearTimeout(errorTimer)
  errorTimer = setTimeout(() => { errorMessage.value = '' }, 3000)
}

// SRS-1.1.1, SRS-1.1.2
async function handleOpenFile() {
  errorMessage.value = ''
  const result = await window.ipcRenderer.openPdfFile()
  if (!result) return

  if (!result.fileName.toLowerCase().endsWith('.pdf')) {
    showError('Unsupported file format')
    return
  }

  pdfBuffer.value   = result.buffer
  pdfFileName.value = result.fileName
}

// เก็บ page ไว้ส่งต่อ Feature 2
function handlePageChanged(page: number) {
  currentPage.value = page
}
</script>

<template>
  <div class="workspace">

    <!-- Toolbar -->
    <header class="workspace__toolbar">
      <span class="workspace__logo">StudyDesk</span>

      <div class="workspace__toolbar-center">
        <button class="workspace__toolbar-btn" @click="handleOpenFile">
          📂 Open PDF
        </button>
        <span v-if="pdfFileName" class="workspace__filename" :title="pdfFileName">
          {{ pdfFileName }}
        </span>
      </div>

      <div class="workspace__toolbar-right"></div>
    </header>

    <!-- Split-screen panes — SRS-1.1.1 -->
    <main class="workspace__panes">

      <section class="workspace__pane">
        <PdfViewer :pdf-buffer="pdfBuffer" @page-changed="handlePageChanged" />
      </section>

      <div class="workspace__divider" />

      <section class="workspace__pane">
        <MarkdownEditor v-model="markdownContent" />
      </section>

    </main>

    <!-- Error message — SRS-1.1.2 -->
    <transition name="toast">
      <div v-if="errorMessage" class="workspace__error">
        ⚠️ {{ errorMessage }}
      </div>
    </transition>

  </div>
</template>

<style>
/* ── Global CSS Variables ─────────────────────────────────────────
   ใส่ใน <style> (ไม่ scoped) เพื่อให้ PdfViewer และ MarkdownEditor
   ที่ใช้ var(--color-*) เหล่านี้ได้รับค่าด้วย
────────────────────────────────────────────────────────────────── */
:root {
  /* Palette — Green & Cream */
  --cream:              #F5F0E8;
  --cream-dark:         #EAE3D2;
  --cream-mid:          #DDD5C0;
  --green-deep:         #2D5A27;
  --green-mid:          #3E7A35;
  --green-light:        #6FAE5F;
  --green-pale:         #C8DFC4;
  --green-tint:         #EAF3E8;
  --text-dark:          #1E2D1C;
  --text-mid:           #3A4E37;
  --text-muted:         #6E8269;

  /* Aliases ที่ PdfViewer.vue และ MarkdownEditor.vue ใช้ */
  --color-bg-pane:      var(--cream);
  --color-bg-secondary: var(--cream-dark);
  --color-bg-toolbar:   var(--green-tint);
  --color-text-primary: var(--text-dark);
  --color-text-secondary: var(--text-mid);
  --color-text-muted:   var(--text-muted);
  --color-accent:       var(--green-mid);
  --color-divider:      var(--cream-mid);
  --color-btn-bg:       var(--green-deep);
  --color-btn-hover:    var(--green-mid);
  --color-error:        #b94040;
  --border-radius:      8px;
  --spacing-xs:         4px;
  --spacing-sm:         8px;
  --spacing-md:         16px;
  --font-mono:          'Courier New', 'Consolas', monospace;
  --font-sans:          'Georgia', 'Palatino Linotype', serif;
  --font-size-sm:       0.78rem;
  --font-size-base:     0.88rem;
}
</style>

<style scoped>
/* ── Reset ────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Workspace root ───────────────────────────────────────────── */
.workspace {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--cream);
  color: var(--text-dark);
  font-family: var(--font-sans);
  overflow: hidden;
}

/* ── Toolbar ──────────────────────────────────────────────────── */
.workspace__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 52px;
  background: var(--green-deep);
  color: var(--cream);
  flex-shrink: 0;
  gap: 12px;
}

.workspace__logo {
  font-size: .95rem;
  font-weight: 700;
  color: var(--green-pale);
  white-space: nowrap;
}

.workspace__toolbar-center {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: center;
}

.workspace__toolbar-right {
  width: 90px; /* balance logo */
}

.workspace__toolbar-btn {
  background: var(--green-mid);
  color: var(--cream);
  border: 1.5px solid var(--green-light);
  border-radius: 8px;
  padding: 5px 16px;
  font-size: .82rem;
  font-family: inherit;
  cursor: pointer;
  transition: background .2s;
  white-space: nowrap;
}
.workspace__toolbar-btn:hover { background: var(--green-light); }

.workspace__filename {
  font-size: .78rem;
  color: var(--green-pale);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

/* ── Split panes — SRS-1.1.1 ──────────────────────────────────── */
.workspace__panes {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.workspace__pane {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.workspace__divider {
  width: 3px;
  background: var(--green-mid);
  opacity: .4;
  flex-shrink: 0;
}

/* ── Error — SRS-1.1.2 ────────────────────────────────────────── */
.workspace__error {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #b94040;
  color: #fff;
  padding: 9px 20px;
  border-radius: 30px;
  font-size: .82rem;
  box-shadow: 0 4px 16px rgba(0,0,0,.25);
  z-index: 200;
  pointer-events: none;
  white-space: nowrap;
}

.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

/* ── Scrollbars ───────────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--cream-dark); }
::-webkit-scrollbar-thumb { background: var(--green-pale); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--green-light); }
</style>