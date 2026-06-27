<script setup lang="ts">
import { ref } from 'vue'
import AlertDialog from './AlertDialog.vue'

const emit = defineEmits<{
  'insert-image': [markdown: string]
}>()

const isDragging  = ref(false)
const errorMsg    = ref('')

// ── Alert Dialog ──────────────────────────────────────────────────
const alertVisible = ref(false)
const alertMessage = ref('')

function showAlert(msg: string) {
  alertMessage.value = msg
  alertVisible.value = true
}

// ── Image size selector ───────────────────────────────────────────
const SIZE_OPTIONS = [
  { label: 'Small', value: 'small',  width: 200 },
  { label: 'Medium', value: 'medium', width: 400 },
  { label: 'Large', value: 'large',  width: 700 },
] as const

type SizeValue = typeof SIZE_OPTIONS[number]['value']
const selectedSize = ref<SizeValue>('medium')

// ── Helpers ───────────────────────────────────────────────────────
const ALLOWED = ['image/jpeg', 'image/png']

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Read failed'))
    reader.readAsDataURL(file)
  })
}


async function processFile(file: File) {
  if (!ALLOWED.includes(file.type)) {
    // 🟢 แก้ข้อความแจ้งเตือนให้ตรงกับ SRS-4.1.5 เป๊ะๆ
    showAlert("Only JPEG and PNG files are supported.")
    return
  }
  try {
    const dataUrl  = await toBase64(file)
    const safeName = file.name.replace(/[^\w.\-]/g, '_')
    const width    = SIZE_OPTIONS.find(o => o.value === selectedSize.value)!.width
    // ใช้ HTML img tag เพื่อจัดการเรื่อง CSS และขนาดภาพ
    const markdown = `<img src="${dataUrl}" alt="${safeName}" style="width:${width}px; max-width:100%; height:auto; border-radius:6px; margin:8px 0;" />`
    emit('insert-image', markdown)
  } catch {
    showAlert('The image file cannot be read. Please try again.')
  }
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    // 🟢 โยนไฟล์ให้ processFile จัดการเรื่อง Validation และแปลง Base64
    processFile(file) 
  }
  
  // Reset input เพื่อให้ผู้ใช้สามารถเลือกไฟล์เดิมซ้ำได้ถ้าต้องการ
  target.value = '' 
}

// ── Drag-and-drop ─────────────────────────────────────────────────
function onDragOver(e: DragEvent) { e.preventDefault(); isDragging.value = true }
function onDragLeave() { isDragging.value = false }
async function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) await processFile(file)
}

const fileInput = ref<HTMLInputElement | null>(null)

// เมื่อกดปุ่ม ให้ไป trigger input ที่ซ่อนอยู่
function onUploadClick() {
  fileInput.value?.click()
}

</script>

<template>
  <div class="iep">
    <div class="iep__header">
      <span class="iep__title">🖼 Insert Image</span>

      <!-- Size selector -->
      <div class="iep__sizes">
        <button
          v-for="opt in SIZE_OPTIONS"
          :key="opt.value"
          class="iep__size-btn"
          :class="{ 'iep__size-btn--active': selectedSize === opt.value }"
          @click="selectedSize = opt.value"
        >
          {{ opt.label }}
          <span class="iep__size-px">{{ opt.width }}px</span>
        </button>
      </div>
    </div>

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

      <input type="file" ref="fileInput" accept="image/jpeg,image/png" style="display: none" @change="handleFileChange" />

      <button class=".iep__upload-btn" @click="onUploadClick">
        Upload from device
      </button>

      <p v-if="errorMsg" class="iep__error">⚠ {{ errorMsg }}</p>
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
  gap: 12px;
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-toolbar);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.iep__title {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  white-space: nowrap;
}

/* Size selector */
.iep__sizes {
  display: flex;
  gap: 4px;
}

.iep__size-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--cream-dark);
  border: 1.5px solid var(--cream-mid);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 0.75rem;
  font-family: var(--font-sans);
  color: var(--text-mid);
  cursor: pointer;
  transition: background .15s, border-color .15s, color .15s;
}

.iep__size-btn:hover {
  background: var(--green-pale);
  border-color: var(--green-light);
  color: var(--green-deep);
}

.iep__size-btn--active {
  background: var(--green-deep);
  border-color: var(--green-deep);
  color: var(--cream);
}

.iep__size-px {
  font-size: 0.68rem;
  opacity: .7;
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

.iep__drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  max-width: 220px;
  min-height: 100px;
  border: 2px dashed var(--color-divider);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  text-align: center;
  background: var(--cream-dark);
  pointer-events: none;
}

.iep__drop-icon { font-size: 1.4rem; }

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

.iep__upload-btn {
  background: var(--color-btn-bg);
  color: var(--cream);
  border: none;
  border-radius: var(--border-radius);
  padding: 6px 18px;
  font-size: var(--font-size-sm);
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background 0.2s;
}
.iep__upload-btn:hover { background: var(--color-btn-hover); }

.iep__error {
  font-size: 0.75rem;
  color: var(--color-error);
  font-family: var(--font-sans);
}
</style>