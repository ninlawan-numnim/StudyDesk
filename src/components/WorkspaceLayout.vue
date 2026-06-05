<script setup lang="ts">
/**
 * WorkspaceLayout.vue — Root workspace component
 *
 * Feature 1: Integrated Split-Screen Interface
 * SRS-1.1.1: PDF Viewer left pane + Markdown Editor right pane
 * SRS-1.1.2: "Unsupported file format" error on non-PDF
 *
 * Feature 4: Visual Reference Embedding
 * URS-4.1: Drag-and-drop / file-picker JPEG & PNG → insert into notes
 * URS-4.2: Preview panel renders embedded images via marked
 */
import { ref, computed } from 'vue'
import PdfViewer      from './PdfViewer.vue'
import MarkdownEditor from './MarkdownEditor.vue'
import ImageEmbedPanel from './ImageEmbedPanel.vue'

// ── Feature 1 ─────────────────────────────────────────────────────
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

function handlePageChanged(page: number) {
  currentPage.value = page
}

// ── Feature 4: Visual Reference Embedding ─────────────────────────
// Ref ไปยัง MarkdownEditor เพื่อเรียก insertAtCursor
const editorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null)

// Toggle panel
const showImagePanel = ref(false)

function toggleImagePanel() {
  showImagePanel.value = !showImagePanel.value
}

/**
 * handleInsertImage — รับ markdown จาก ImageEmbedPanel แล้วส่งเข้า editor
 * URS-4.1: แทรก markdown image syntax ที่ cursor ของ editor
 */
function handleInsertImage(markdown: string) {
  editorRef.value?.insertAtCursor(markdown)
  showImagePanel.value = false  // ปิด panel หลังแทรกสำเร็จ
}

// ── Preview — URS-4.2 ─────────────────────────────────────────────
const showPreview = ref(false)

/**
 * renderMarkdown — แปลง markdown เป็น HTML สำหรับ Preview pane
 * รองรับ image syntax: ![alt](src)
 * ใช้ inline parser เรียบง่าย — ไม่ต้อง import library เพิ่ม
 */
function renderMarkdown(md: string): string {
  return md
    // Images — ต้องแปลงก่อน links เพราะ pattern ซ้อนกัน
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%;border-radius:6px;margin:8px 0;" />')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:var(--cream-dark);padding:1px 4px;border-radius:3px;font-family:var(--font-mono);">$1</code>')
    // Headings (h1-h3)
    .replace(/^### (.+)$/gm, '<h3 style="margin:.6em 0 .2em;color:var(--green-deep);">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="margin:.7em 0 .2em;color:var(--green-deep);">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="margin:.8em 0 .2em;color:var(--green-deep);">$1</h1>')
    // Line breaks
    .replace(/\n/g, '<br>')
}

const previewHtml = computed(() => renderMarkdown(markdownContent.value))
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

      <!-- Feature 4 buttons (right side of toolbar) -->
      <div class="workspace__toolbar-right">
        <button
          class="workspace__toolbar-btn workspace__toolbar-btn--icon"
          :class="{ 'workspace__toolbar-btn--active': showImagePanel }"
          title="Insert Image (Feature 4)"
          @click="toggleImagePanel"
        >
          🖼 Image
        </button>
        <button
          class="workspace__toolbar-btn workspace__toolbar-btn--icon"
          :class="{ 'workspace__toolbar-btn--active': showPreview }"
          title="Toggle Preview"
          @click="showPreview = !showPreview"
        >
          👁 Preview
        </button>
      </div>
    </header>

    <!-- Split-screen panes — SRS-1.1.1 -->
    <main class="workspace__panes">

      <!-- Left: PDF Viewer -->
      <section class="workspace__pane">
        <PdfViewer :pdf-buffer="pdfBuffer" @page-changed="handlePageChanged" />
      </section>

      <div class="workspace__divider" />

      <!-- Right: Editor + optional panels -->
      <section class="workspace__pane workspace__pane--right">

        <!-- Feature 4: Image Embed Panel (overlay above editor) -->
        <transition name="slide-down">
          <div v-if="showImagePanel" class="workspace__image-panel">
            <ImageEmbedPanel @insert-image="handleInsertImage" />
          </div>
        </transition>

        <!-- Markdown Editor -->
        <div class="workspace__editor-area" :class="{ 'workspace__editor-area--half': showPreview }">
          <MarkdownEditor ref="editorRef" v-model="markdownContent" />
        </div>

        <!-- Feature 4 URS-4.2: Preview pane -->
        <transition name="slide-left">
          <div v-if="showPreview" class="workspace__preview">
            <div class="workspace__preview-header">
              <span class="workspace__preview-label">👁 Preview</span>
            </div>
            <div
              class="workspace__preview-body"
              v-html="previewHtml"
            />
          </div>
        </transition>

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
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

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
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
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
.workspace__toolbar-btn--active {
  background: var(--green-light);
  border-color: var(--cream);
}

.workspace__filename {
  font-size: .78rem;
  color: var(--green-pale);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

/* ── Split panes ──────────────────────────────────────────────── */
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

.workspace__pane--right {
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.workspace__divider {
  width: 3px;
  background: var(--green-mid);
  opacity: .4;
  flex-shrink: 0;
}

/* ── Feature 4: Image Embed Panel (slide-in from top) ────────── */
.workspace__image-panel {
  flex-shrink: 0;
  height: 220px;
  border-bottom: 2px solid var(--green-mid);
  overflow: hidden;
}

/* ── Editor area ─────────────────────────────────────────────── */
.workspace__editor-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.workspace__editor-area--half {
  flex: 1;
  min-height: 0;
}

/* ── Feature 4 URS-4.2: Preview pane ─────────────────────────── */
.workspace__preview {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-top: 2px solid var(--green-mid);
  background: var(--cream);
}

.workspace__preview-header {
  display: flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-toolbar);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.workspace__preview-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
}

.workspace__preview-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  color: var(--text-dark);
  line-height: 1.7;
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

/* ── Transitions ──────────────────────────────────────────────── */
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

.slide-down-enter-active, .slide-down-leave-active { transition: all .2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-10px); }

.slide-left-enter-active, .slide-left-leave-active { transition: all .2s ease; }
.slide-left-enter-from, .slide-left-leave-to { opacity: 0; }

/* ── Scrollbars ───────────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--cream-dark); }
::-webkit-scrollbar-thumb { background: var(--green-pale); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--green-light); }
</style>