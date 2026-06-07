<script setup lang="ts">
import * as pdfjsLib from 'pdfjs-dist'
import { ref, shallowRef, watch } from 'vue'

// ── Polyfill for Promise.try (TypeScript Safe) ──────────────────────────
// ช่วยให้รันบน Electron/Chromium เวอร์ชันเก่าได้โดยไม่เกิดข้อผิดพลาด Uncaught TypeError
if (typeof (Promise as any).try !== 'function') {
  (Promise as any).try = function (fn: (...args: any[]) => any, ...args: any[]) {
    return new Promise((resolve, reject) => {
      try {
        resolve(fn(...args));
      } catch (error) {
        reject(error);
      }
    });
  };
}

// ── Props ─────────────────────────────────────────────
const props = defineProps<{
  pdfBuffer: number[] | null
  initialPage: number 
}>()

const emit = defineEmits<{
  pageChanged: [page: number]
}>()

// ── State ─────────────────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null)
const currentPage = ref(1)
const totalPages = ref(0)
const isLoading = ref(false)
const errorMessage = ref('')
const pdfDoc = shallowRef<pdfjsLib.PDFDocumentProxy | null>(null)
// ── Render ────────────────────────────────────────────
async function renderPage(pageNum: number) {
  if (!pdfDoc.value || !canvasRef.value) return

  isLoading.value = true
  try {
    const page = await pdfDoc.value.getPage(pageNum)
    const canvas = canvasRef.value
    const viewport = page.getViewport({ scale: 1.5 })
    const ctx = canvas.getContext('2d')!

    canvas.height = viewport.height
    canvas.width = viewport.width

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise

    emit('pageChanged', pageNum)
  } finally {
    isLoading.value = false
  }
}

// ── Load PDF ──────────────────────────────────────────
watch(
  // watch ทั้ง pdfBuffer และ initialPage พร้อมกัน
  () => [props.pdfBuffer, props.initialPage] as const,
  async ([newBuffer, newInitialPage]) => {
    if (!newBuffer) return

    errorMessage.value = ''
    totalPages.value = 0

    if (pdfDoc.value) {
      await pdfDoc.value.destroy()
    }
    pdfDoc.value = null

    try {
      const uint8 = new Uint8Array(newBuffer)

      pdfDoc.value = await pdfjsLib.getDocument({
        data: uint8,
        useWorkerFetch: false,
        useSystemFonts: true,
        disableStream: true,
        cMapUrl: '/',
        cMapPacked: true,
        standardFontDataUrl: '/',
      }).promise

      totalPages.value = pdfDoc.value.numPages

      // ใช้ newInitialPage จาก watch tuple — ค่า ณ เวลา render
      const startPage = Math.min(
        Math.max(newInitialPage ?? 1, 1),
        pdfDoc.value.numPages              // ป้องกันหน้าเกิน total
      )
      currentPage.value = startPage
      await renderPage(startPage)

    } catch (e) {
      errorMessage.value = 'Failed to load PDF. The file may be corrupted.'
      console.error('[PdfViewer] Load error:', e)
    }
  },
  { deep: false }
)

// ── Navigation ────────────────────────────────────────
async function goToPage(delta: number) {
  const next = currentPage.value + delta
  if (next < 1 || next > totalPages.value) return
  currentPage.value = next
  await renderPage(currentPage.value)
}
</script>

<template>
  <div class="pdf-viewer">
    <div v-if="!pdfBuffer && !errorMessage" class="pdf-viewer__empty">
      <div class="pdf-viewer__empty-icon">📄</div>
      <p class="pdf-viewer__empty-text">Open a PDF file to begin</p>
      <p class="pdf-viewer__empty-hint">Use the toolbar button above</p>
    </div>

    <div v-if="errorMessage" class="pdf-viewer__error">
      <span>⚠️ {{ errorMessage }}</span>
    </div>

    <div v-if="isLoading" class="pdf-viewer__loading">
      <span>Rendering...</span>
    </div>

    <div v-if="pdfBuffer" class="pdf-viewer__canvas-wrapper">
      <canvas ref="canvasRef" class="pdf-viewer__canvas" />
    </div>

    <div v-if="totalPages > 0" class="pdf-viewer__controls">
      <button
        class="pdf-viewer__btn"
        :disabled="currentPage <= 1"
        @click="goToPage(-1)"
      >
        ← Prev
      </button>
      <span class="pdf-viewer__page-info">
        {{ currentPage }} / {{ totalPages }}
      </span>
      <button
        class="pdf-viewer__btn"
        :disabled="currentPage >= totalPages"
        @click="goToPage(1)"
      >
        Next →
      </button>
    </div>
  </div>
</template>

<style scoped>
.pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-pane);
  position: relative;
}

.pdf-viewer__canvas-wrapper {
  flex: 1;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: var(--spacing-md);
  background-color: var(--color-bg-secondary);
}

.pdf-viewer__canvas {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  border-radius: var(--border-radius);
  max-width: 100%;
}

.pdf-viewer__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-divider);
  background-color: var(--color-bg-toolbar);
  flex-shrink: 0;
}

.pdf-viewer__btn {
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: var(--color-btn-bg);
  color: var(--color-text-primary);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  transition: background-color 0.15s ease;
}

.pdf-viewer__btn:hover:not(:disabled) {
  background-color: var(--color-btn-hover);
}

.pdf-viewer__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pdf-viewer__page-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 80px;
  text-align: center;
}

.pdf-viewer__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.pdf-viewer__empty-icon {
  font-size: 3rem;
  opacity: 0.4;
}

.pdf-viewer__empty-text {
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
}

.pdf-viewer__empty-hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.pdf-viewer__error {
  padding: var(--spacing-md);
  color: var(--color-error);
  text-align: center;
  font-size: var(--font-size-sm);
}

.pdf-viewer__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  z-index: 10;
}
</style>