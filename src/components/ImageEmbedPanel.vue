<script setup lang="ts">
/**
 * ImageEmbedPanel.vue — Feature 4: Visual Reference Embedding
 *
 * URS-4.1: Drag-and-drop JPEG/PNG images into markdown notes
 * URS-4.2: View embedded images seamlessly alongside written text
 *
 * Emits:
 *   insert-image(markdownText: string) — parent (WorkspaceLayout) จะนำไปแทรก
 *                                         ใน MarkdownEditor ที่ cursor ปัจจุบัน
 */
import { ref } from 'vue'

const emit = defineEmits<{
  'insert-image': [markdown: string]
}>()

const isDragging = ref(false)
const errorMsg   = ref('')

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

const ALLOWED = ['image/jpeg', 'image/png']

function isAllowed(file: File): boolean {
  return ALLOWED.includes(file.type)
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Read failed'))
    reader.readAsDataURL(file)
  })
}

function showError(msg: string) {
  errorMsg.value = msg
  setTimeout(() => { errorMsg.value = '' }, 3000)
}

async function processFile(file: File) {
  if (!isAllowed(file)) {
    showError('Only JPEG and PNG files are supported.')
    return
  }

  try {
    const dataUrl  = await toBase64(file)
    const safeName = file.name.replace(/[^\w.\-]/g, '_')
    // Standard Markdown image syntax — URS-4.2
    const markdown = `![${safeName}](${dataUrl})`
    emit('insert-image', markdown)
  } catch {
    showError('Failed to read the image file.')
  }
}

// ─────────────────────────────────────────────────────
// Drag-and-drop handlers — URS-4.1
// ─────────────────────────────────────────────────────

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) await processFile(file)
}

// ─────────────────────────────────────────────────────
// File-picker button handler — URS-4.1
// ─────────────────────────────────────────────────────

async function onUploadClick() {
  const input = document.createElement('input')
  input.type   = 'file'
  input.accept = 'image/jpeg,image/png'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (file) await processFile(file)
  }
  input.click()
}
</script>

<template>
  <div class="iep">
    <!-- Header -->
    <div class="iep__header">
      <span class="iep__title">🖼 Insert Image</span>
    </div>

    <!-- Drop zone + upload button -->
    <div
      class="iep__body"
      :class="{ 'iep__body--dragging': isDragging }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div class="iep__drop-zone">
        <span class="iep__drop-icon">📥</span>
        <p class="iep__drop-label">Drag and drop HERE</p>
        <p class="iep__drop-sub">JPEG or PNG</p>
      </div>

      <button class="iep__upload-btn" @click="onUploadClick">
        Upload from device
      </button>

      <p v-if="errorMsg" class="iep__error">⚠ {{ errorMsg }}</p>
    </div>
  </div>
</template>

<style scoped>
.iep {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-pane);
}

/* Header */
.iep__header {
  display: flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-toolbar);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.iep__title {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
}

/* Body */
.iep__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  transition: background 0.2s;
}

.iep__body--dragging {
  background: var(--green-tint);
  outline: 2px dashed var(--green-mid);
  outline-offset: -6px;
}

/* Drop zone box */
.iep__drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  max-width: 220px;
  min-height: 120px;
  border: 2px dashed var(--color-divider);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  text-align: center;
  background: var(--cream-dark);
  pointer-events: none; /* drop events handled on .iep__body */
}

.iep__drop-icon {
  font-size: 1.6rem;
}

.iep__drop-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  font-weight: 600;
}

.iep__drop-sub {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  font-family: var(--font-sans);
}

/* Upload button */
.iep__upload-btn {
  background: var(--color-btn-bg);
  color: var(--cream);
  border: none;
  border-radius: var(--border-radius);
  padding: 7px 20px;
  font-size: var(--font-size-sm);
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background 0.2s;
}

.iep__upload-btn:hover {
  background: var(--color-btn-hover);
}

/* Error */
.iep__error {
  font-size: 0.75rem;
  color: var(--color-error);
  font-family: var(--font-sans);
  text-align: center;
}
</style>