<script setup lang="ts">
/**
 * WorkspaceLayout.vue — Root workspace component
 *
 * จัดการ:
 * 1. เปิดไฟล์ PDF ผ่าน IPC → Main Process
 * 2. ส่ง buffer ลงไปให้ PdfViewer
 * 3. เก็บ markdownContent สำหรับ Feature 2
 * 4. แสดง error ตาม SRS-1.1.2
 */
import { ref } from 'vue'
import PdfViewer from '../components/PdfViewer.vue'
import MarkdownEditor from './MarkdownEditor.vue'

// --- State ---
const pdfBuffer = ref<number[] | null>(null)
const pdfFileName = ref<string>('')
const markdownContent = ref<string>('# My Notes\n\nStart writing here...')
const errorMessage = ref<string>('')
const currentPage = ref<number>(1)

// --- Open PDF via IPC (SRS-1.1.1, SRS-1.1.2) ---
async function handleOpenFile() {
  // Clear previous error ทุกครั้งที่กดเปิดใหม่
  errorMessage.value = ''

  const result = await window.ipcRenderer.openPdfFile()

  // null = user กด cancel — ไม่ต้องทำอะไร
  if (!result) return

  // Defensive check — Main Process กรองแล้ว แต่ตรวจซ้ำเพื่อความปลอดภัย (SRS-1.1.2)
  if (!result.fileName.toLowerCase().endsWith('.pdf')) {
    errorMessage.value = 'Unsupported file format'
    return
  }

  pdfBuffer.value = result.buffer
  pdfFileName.value = result.fileName
}

// --- Receive page change event จาก PdfViewer ---
// เก็บไว้ที่นี่เพื่อส่งต่อให้ DB ใน Feature 2
function handlePageChanged(page: number) {
  currentPage.value = page
}
</script>

<template>
  <div class="workspace">

    <!-- Toolbar -->
    <header class="workspace__toolbar">
      <button class="workspace__toolbar-btn" @click="handleOpenFile">
        📂 Open PDF
      </button>

      <!-- แสดงชื่อไฟล์ที่กำลังเปิดอยู่ -->
      <span v-if="pdfFileName" class="workspace__filename">
        {{ pdfFileName }}
      </span>

      <!-- Error toast — SRS-1.1.2 -->
      <span v-if="errorMessage" class="workspace__error">
        ⚠️ {{ errorMessage }}
      </span>
    </header>

    <!-- Split-screen panes -->
    <main class="workspace__panes">

      <!-- Left pane: PDF Viewer -->
      <section class="workspace__pane">
        <PdfViewer
          :pdf-buffer="pdfBuffer"
          @page-changed="handlePageChanged"
        />
      </section>

      <!-- Visual divider -->
      <div class="workspace__divider" />

      <!-- Right pane: Markdown Editor -->
      <section class="workspace__pane">
        <MarkdownEditor v-model="markdownContent" />
      </section>

    </main>
  </div>
</template>

<style scoped>
/* Root container — เต็ม viewport */
.workspace {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: var(--color-bg-primary);
}

/* Toolbar */
.workspace__toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: 0 var(--spacing-md);
  height: var(--toolbar-height);
  background-color: var(--color-bg-toolbar);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.workspace__toolbar-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: var(--color-accent);
  color: var(--color-bg-primary);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  font-weight: 600;
  transition: background-color 0.15s ease;
}

.workspace__toolbar-btn:hover {
  background-color: var(--color-accent-hover);
}

.workspace__filename {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  /* ป้องกันชื่อไฟล์ยาวเกินไปจนล้น toolbar */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.workspace__error {
  font-size: var(--font-size-sm);
  color: var(--color-error);
}

/* Split-screen layout */
.workspace__panes {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.workspace__pane {
  flex: 1;
  overflow: hidden;
  min-width: 0; /* สำคัญมาก — ป้องกัน flexbox overflow */
}

/* Divider bar */
.workspace__divider {
  width: var(--divider-width);
  background-color: var(--color-divider);
  flex-shrink: 0;
}
</style>