<!-- src/components/OcrUploadPanel.vue -->
<!-- Feature 3: AI-Powered Image Text Extraction (Progress I — UI Only) -->
<!-- SRS-3.1.1: Upload button for JPEG/PNG                              -->
<!-- SRS-3.1.2: Show "Upload Successful" on valid file selected         -->

<script setup lang="ts">
import { ref } from 'vue'
import AlertDialog from './AlertDialog.vue'
import { extractTextFromImage, OcrError } from '../services/gemini'

const ALLOWED = ['image/jpeg', 'image/png']

const emit = defineEmits<{ 'text-extracted': [text: string] }>()

const status    = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const fileName  = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const alertVisible = ref(false)
const alertMessage = ref('')
const alertTitle   = ref('Unsupported File')

function showAlert(msg: string, title = 'Unsupported File') {
  alertTitle.value   = title
  alertMessage.value = msg
  alertVisible.value = true
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Read failed'))
    reader.readAsDataURL(file)
  })
}

function onUploadClick() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = '' // reset ให้เลือกไฟล์เดิมซ้ำได้

  if (!file) return

  // SRS-3.1.1 (เดิม) — ตรวจนามสกุลไฟล์ ไม่เปลี่ยน
  if (!ALLOWED.includes(file.type)) {
    showAlert('Only JPEG and PNG files are supported.')
    status.value = 'error'
    return
  }

  // SRS-3.2.1 / 3.2.2 — เช็ค connectivity ก่อนยิง API เสมอ
  if (!navigator.onLine) {
    showAlert('Internet connection required for AI features.', 'Offline')
    status.value = 'error'
    return
  }

  status.value   = 'loading'
  fileName.value = file.name

  try {
    // SRS-3.2.3 — ส่งภาพไป Gemini พร้อม loading indicator (status = 'loading')
    const dataUrl = await toBase64(file)
    const text = await extractTextFromImage(dataUrl, file.type)

    // SRS-3.2.4 — สำเร็จ ส่ง text ให้ parent insert ที่ cursor
    status.value = 'success'
    emit('text-extracted', text)
    setTimeout(() => { status.value = 'idle'; fileName.value = '' }, 3000)
  } catch (err) {
    // SRS-3.2.5 — error เฉพาะเจาะจง ไม่ insert อะไร
    status.value = 'error'
    const msg = err instanceof OcrError
      ? err.message
      : 'Text extraction failed. Please try again.'
    showAlert(msg, 'Extraction Failed')
  }
}
</script>

<template>
  <div class="ocr">
    <div class="ocr__header">
      <span class="ocr__title">🔍 OCR — Image Text Extraction</span>
    </div>

    <div class="ocr__body">
      <div class="ocr__icon-wrap">
        <span class="ocr__icon">🖼️</span>
      </div>

      <p class="ocr__desc">
        Upload an image file (JPEG or PNG) to extract text using AI.
      </p>

      <input type="file" ref="fileInput" accept="image/jpeg,image/png" style="display: none" @change="handleFileChange" />

      <button class="ocr__upload-btn" :disabled="status === 'loading'" @click="onUploadClick">
  {{ status === 'loading' ? 'Extracting text…' : 'Upload from device' }}
</button>

<div v-if="status === 'loading'" class="ocr__msg ocr__msg--loading">
  ⏳ Sending to Gemini…
</div>
<transition name="fade">
  <div v-if="status === 'success'" class="ocr__msg ocr__msg--success">
    ✓ Text Extracted
    <span v-if="fileName" class="ocr__filename">{{ fileName }}</span>
  </div>
</transition>
    </div>

    <!-- Alert Dialog -->
    <AlertDialog
      :visible="alertVisible"
      title="Unsupported File"
      :message="alertMessage"
      type="error"
      @close="alertVisible = false"
    />
  </div>
</template>

<style scoped>
.ocr {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-pane);
}

.ocr__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-toolbar);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.ocr__title {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  white-space: nowrap;
}

.ocr__badge {
  font-size: 0.68rem;
  background: var(--cream-mid);
  color: var(--text-muted);
  border-radius: 10px;
  padding: 1px 8px;
  font-family: var(--font-sans);
}

.ocr__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

.ocr__icon-wrap {
  width: 64px;
  height: 64px;
  background: var(--cream-dark);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ocr__icon { font-size: 2rem; }

.ocr__desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  text-align: center;
  max-width: 240px;
  line-height: 1.6;
}

.ocr__upload-btn {
  background: var(--color-btn-bg);
  color: var(--cream);
  border: none;
  border-radius: var(--border-radius);
  padding: 7px 22px;
  font-size: var(--font-size-sm);
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background .2s;
}
.ocr__upload-btn:hover { background: var(--color-btn-hover); }

.ocr__msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: var(--font-size-sm);
  font-family: var(--font-sans);
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 20px;
}
.ocr__msg--success {
  background: #e6f4e3;
  color: var(--green-deep);
}

.ocr__filename {
  font-size: 0.7rem;
  font-weight: 400;
  color: var(--text-muted);
}

.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>