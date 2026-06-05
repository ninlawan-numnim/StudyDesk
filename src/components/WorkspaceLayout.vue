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
import PdfViewer       from './PdfViewer.vue'
import MarkdownEditor  from './MarkdownEditor.vue'
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

// ── Editor sub-toolbar state ───────────────────────────────────────
// activeTab: 'write' | 'preview' — ตาม mockup ปุ่ม Write / Preview
const activeTab = ref<'write' | 'preview'>('write')

// ── Feature 4: Visual Reference Embedding ─────────────────────────
const editorRef      = ref<InstanceType<typeof MarkdownEditor> | null>(null)
const showImagePanel = ref(false)

function handleInsertImage(markdown: string) {
  editorRef.value?.insertAtCursor(markdown)
  showImagePanel.value = false
}

// ── Formatting helpers (B, I, H1, H2) — placeholders รอ feature อื่น ──
function handleFormat(type: 'bold' | 'italic' | 'h1' | 'h2') {
  const wrap: Record<string, [string, string]> = {
    bold:   ['**', '**'],
    italic: ['*',  '*'],
    h1:     ['# ', ''],
    h2:     ['## ', ''],
  }
  const [before, after] = wrap[type]
  editorRef.value?.insertAtCursor(`${before}text${after}`)
}

// ── Preview — URS-4.2 ─────────────────────────────────────────────
function renderMarkdown(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img alt="$1" src="$2" style="max-width:100%;border-radius:6px;margin:8px 0;" />')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`([^`]+)`/g,
      '<code style="background:var(--cream-dark);padding:1px 4px;border-radius:3px;font-family:var(--font-mono);">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 style="margin:.6em 0 .2em;color:var(--green-deep);">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="margin:.7em 0 .2em;color:var(--green-deep);">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="margin:.8em 0 .2em;color:var(--green-deep);">$1</h1>')
    .replace(/\n/g, '<br>')
}

const previewHtml = computed(() => renderMarkdown(markdownContent.value))
</script>

<template>
  <div class="workspace">

    <!-- ── Global Toolbar (Feature 1) ─────────────────────────── -->
    <header class="workspace__toolbar">
      <span class="workspace__logo">Study<span class="workspace__logo-accent">Desk</span></span>

      <div class="workspace__toolbar-center">
        <button class="workspace__toolbar-btn" @click="handleOpenFile">
          Open PDF
        </button>
        <span v-if="pdfFileName" class="workspace__filename" :title="pdfFileName">
          {{ pdfFileName }}
        </span>
      </div>

      <div class="workspace__toolbar-right" />
    </header>

    <!-- ── Split-screen panes ─────────────────────────────────── -->
    <main class="workspace__panes">

      <!-- Left: PDF Viewer -->
      <section class="workspace__pane">
        <PdfViewer :pdf-buffer="pdfBuffer" @page-changed="handlePageChanged" />
      </section>

      <div class="workspace__divider" />

      <!-- Right: Editor pane with its own sub-toolbar -->
      <section class="workspace__pane workspace__pane--right">

        <!-- ── Editor sub-toolbar (ตาม mockup) ─────────────── -->
        <div class="editor-bar">

          <!-- Formatting buttons: B I H1 H2 -->
          <div class="editor-bar__group">
            <button class="editor-bar__fmt" title="Bold" @click="handleFormat('bold')">
              <strong>B</strong>
            </button>
            <button class="editor-bar__fmt editor-bar__fmt--italic" title="Italic" @click="handleFormat('italic')">
              I
            </button>
            <button class="editor-bar__fmt" title="Heading 1" @click="handleFormat('h1')">H1</button>
            <button class="editor-bar__fmt" title="Heading 2" @click="handleFormat('h2')">H2</button>
          </div>

          <div class="editor-bar__sep" />

          <!-- Image embed button (Feature 4) -->
          <button
            class="editor-bar__fmt"
            :class="{ 'editor-bar__fmt--active': showImagePanel }"
            title="Insert Image"
            @click="showImagePanel = !showImagePanel"
          >
            🖼
          </button>

          <div class="editor-bar__sep" />

          <!-- +AI placeholder — รอ feature อื่น -->
          <button class="editor-bar__ai" disabled title="AI Assistant (coming soon)">
            + AI
          </button>

          <!-- Spacer -->
          <div class="editor-bar__spacer" />

          <!-- Write / Preview tabs -->
          <div class="editor-bar__tabs">
            <button
              class="editor-bar__tab"
              :class="{ 'editor-bar__tab--active': activeTab === 'write' }"
              @click="activeTab = 'write'"
            >Write</button>
            <button
              class="editor-bar__tab"
              :class="{ 'editor-bar__tab--active': activeTab === 'preview' }"
              @click="activeTab = 'preview'"
            >Preview</button>
          </div>
        </div>

        <!-- Feature 4: Image Embed Panel -->
        <transition name="slide-down">
          <div v-if="showImagePanel" class="workspace__image-panel">
            <ImageEmbedPanel @insert-image="handleInsertImage" />
          </div>
        </transition>

        <!-- Write tab: Markdown Editor -->
        <div v-show="activeTab === 'write'" class="workspace__editor-area">
          <MarkdownEditor ref="editorRef" v-model="markdownContent" />
        </div>

        <!-- Preview tab: Rendered markdown — URS-4.2 -->
        <div v-show="activeTab === 'preview'" class="workspace__preview-body">
          <div v-html="previewHtml" />
        </div>

      </section>

    </main>

    <!-- Error toast — SRS-1.1.2 -->
    <transition name="toast">
      <div v-if="errorMessage" class="workspace__error">
        ⚠️ {{ errorMessage }}
      </div>
    </transition>

  </div>
</template>

<style>
:root {
  --cream:                #F5F0E8;
  --cream-dark:           #EAE3D2;
  --cream-mid:            #DDD5C0;
  --green-deep:           #2D5A27;
  --green-mid:            #3E7A35;
  --green-light:          #6FAE5F;
  --green-pale:           #C8DFC4;
  --green-tint:           #EAF3E8;
  --text-dark:            #1E2D1C;
  --text-mid:             #3A4E37;
  --text-muted:           #6E8269;

  --color-bg-pane:        var(--cream);
  --color-bg-secondary:   var(--cream-dark);
  --color-bg-toolbar:     var(--green-tint);
  --color-text-primary:   var(--text-dark);
  --color-text-secondary: var(--text-mid);
  --color-text-muted:     var(--text-muted);
  --color-accent:         var(--green-mid);
  --color-divider:        var(--cream-mid);
  --color-btn-bg:         var(--green-deep);
  --color-btn-hover:      var(--green-mid);
  --color-error:          #b94040;
  --border-radius:        8px;
  --spacing-xs:           4px;
  --spacing-sm:           8px;
  --spacing-md:           16px;
  --font-mono:            'Courier New', 'Consolas', monospace;
  --font-sans:            'Georgia', 'Palatino Linotype', serif;
  --font-size-sm:         0.78rem;
  --font-size-base:       0.88rem;
}
</style>

<style scoped>
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

/* ── Global toolbar ───────────────────────────────────────────── */
.workspace__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 48px;
  background: var(--green-deep);
  color: var(--cream);
  flex-shrink: 0;
  gap: 12px;
}

.workspace__logo {
  font-size: .95rem;
  font-weight: 700;
  color: var(--cream);
  white-space: nowrap;
}
.workspace__logo-accent { color: var(--green-pale); }

.workspace__toolbar-center {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: center;
}
.workspace__toolbar-right { width: 80px; }

.workspace__toolbar-btn {
  background: transparent;
  color: var(--cream);
  border: 1.5px solid var(--green-pale);
  border-radius: 20px;
  padding: 4px 18px;
  font-size: .82rem;
  font-family: inherit;
  cursor: pointer;
  transition: background .15s;
}
.workspace__toolbar-btn:hover { background: var(--green-mid); }

.workspace__filename {
  font-size: .75rem;
  color: var(--green-pale);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
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
  overflow: hidden;
}

.workspace__divider {
  width: 3px;
  background: var(--green-mid);
  opacity: .35;
  flex-shrink: 0;
}

/* ── Editor sub-toolbar ───────────────────────────────────────── */
.editor-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 10px;
  height: 36px;
  background: var(--cream-dark);
  border-bottom: 1px solid var(--cream-mid);
  flex-shrink: 0;
}

.editor-bar__group {
  display: flex;
  align-items: center;
  gap: 1px;
}

.editor-bar__sep {
  width: 1px;
  height: 18px;
  background: var(--cream-mid);
  margin: 0 6px;
  flex-shrink: 0;
}

.editor-bar__spacer {
  flex: 1;
}

/* Formatting buttons */
.editor-bar__fmt {
  background: transparent;
  border: none;
  border-radius: 5px;
  padding: 3px 7px;
  font-size: .78rem;
  font-family: var(--font-mono);
  color: var(--text-mid);
  cursor: pointer;
  line-height: 1;
  transition: background .12s, color .12s;
  min-width: 26px;
}
.editor-bar__fmt:hover {
  background: var(--cream-mid);
  color: var(--text-dark);
}
.editor-bar__fmt--italic {
  font-style: italic;
  font-family: var(--font-sans);
}
.editor-bar__fmt--active {
  background: var(--green-pale);
  color: var(--green-deep);
}

/* +AI button */
.editor-bar__ai {
  background: var(--green-deep);
  color: var(--cream);
  border: none;
  border-radius: 12px;
  padding: 3px 12px;
  font-size: .75rem;
  font-family: var(--font-sans);
  cursor: not-allowed;
  opacity: .6;
  white-space: nowrap;
}

/* Write / Preview tabs */
.editor-bar__tabs {
  display: flex;
  gap: 0;
  margin-left: 8px;
}

.editor-bar__tab {
  background: transparent;
  border: none;
  padding: 4px 12px;
  font-size: .78rem;
  font-family: var(--font-sans);
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color .15s, border-color .15s;
  line-height: 1;
}
.editor-bar__tab:hover { color: var(--text-dark); }
.editor-bar__tab--active {
  color: var(--green-deep);
  border-bottom-color: var(--green-mid);
  font-weight: 600;
}

/* ── Image embed panel ────────────────────────────────────────── */
.workspace__image-panel {
  flex-shrink: 0;
  height: 220px;
  border-bottom: 1px solid var(--cream-mid);
  overflow: hidden;
}

/* ── Editor & preview areas ───────────────────────────────────── */
.workspace__editor-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.workspace__preview-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--spacing-md) 20px;
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  color: var(--text-dark);
  line-height: 1.8;
  background: var(--cream);
}

/* ── Error toast ──────────────────────────────────────────────── */
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
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }

/* ── Scrollbars ───────────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--cream-dark); }
::-webkit-scrollbar-thumb { background: var(--green-pale); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--green-light); }
</style>