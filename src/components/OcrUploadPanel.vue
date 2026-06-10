<!-- src/components/OcrUploadPanel.vue -->
<!-- Feature 3: AI-Powered Image Text Extraction (Progress I — UI Only) -->
<!-- SRS-3.1.1: Upload button for JPEG/PNG                              -->
<!-- SRS-3.1.2: Show "Upload Successful" on valid file selected         -->

<script setup lang="ts">
import { ref } from 'vue'
import AlertDialog from './AlertDialog.vue'

const ALLOWED = ['image/jpeg', 'image/png']

const status   = ref<'idle' | 'success' | 'error'>('idle')
const fileName = ref('')

// ── Alert Dialog ──────────────────────────────────────────────────
const alertVisible = ref(false)
const alertMessage = ref('')

function showAlert(msg: string) {
  alertMessage.value = msg
  alertVisible.value = true
}

function showStatus(s: 'success' | 'error', name = '') {
  status.value   = s
  fileName.value = name
  if (s === 'success') {
    setTimeout(() => { status.value = 'idle'; fileName.value = '' }, 3000)
  }
}

async function onUploadClick() {
  const input    = document.createElement('input')
  input.type     = 'file'
  input.accept   = 'image/jpeg,image/png'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    if (!ALLOWED.includes(file.type)) {
      showAlert(`ไฟล์ "${file.name}" ไม่รองรับ\nกรุณาอัปโหลดเฉพาะไฟล์ JPEG หรือ PNG เท่านั้น`)
      showStatus('error')
      return
    }
    showStatus('success', file.name)
  }
  input.click()
}
</script>

<template>
  <div class="ocr">
    <div class="ocr__header">
      <span class="ocr__title">🔍 OCR — Image Text Extraction</span>
      <span class="ocr__badge">Progress I · UI Only</span>
    </div>

    <div class="ocr__body">
      <div class="ocr__icon-wrap">
        <span class="ocr__icon">🖼️</span>
      </div>

      <p class="ocr__desc">
        Upload an image file (JPEG or PNG) to extract text using AI.
      </p>

      <!-- Upload button — SRS-3.1.1 -->
      <button class="ocr__upload-btn" @click="onUploadClick">
        Upload from device
      </button>

      <!-- Status messages — SRS-3.1.2 -->
      <transition name="fade">
        <div v-if="status === 'success'" class="ocr__msg ocr__msg--success">
          ✓ Upload Successful
          <span v-if="fileName" class="ocr__filename">{{ fileName }}</span>
        </div>
      </transition>
    </div>

    <!-- Alert Dialog -->
    <AlertDialog
      :visible="alertVisible"
      title="ไฟล์ไม่รองรับ"
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