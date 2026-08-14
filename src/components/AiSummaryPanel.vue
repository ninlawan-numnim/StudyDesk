<script setup lang="ts">
import { ref, computed } from 'vue'
import AlertDialog from './AlertDialog.vue'
import { summarizeContent, SummaryError } from '../services/gemini'

// Local type for summary source options (gemini service does not export this)
type SummarySource = 'pdf' | 'notes' | 'both'

const props = defineProps<{
  pdfAvailable: boolean
  notesContent: string
  // ดึง text เต็มของ PDF ที่เปิดอยู่ — มาจาก PdfViewer.getFullText()
  // ผ่าน WorkspaceLayout (เป็น async เพราะ pdf.js อ่านทีละหน้า)
  getPdfText: () => Promise<string>
}>()

const emit = defineEmits<{ 'summary-generated': [markdown: string] }>()

// ── Source selector — SRS-5.1.1 ─────────────────────────────────────
const SOURCE_OPTIONS = [
  { label: 'PDF',   value: 'pdf'   },
  { label: 'Notes', value: 'notes' },
  { label: 'Both',  value: 'both'  },
] as const

const selectedSource = ref<SummarySource>('both')

const status = ref<'idle' | 'reading-pdf' | 'loading' | 'success' | 'error'>('idle')

// ── Alert Dialog state ───────────────────────────────────────────────
const alertVisible = ref(false)
const alertMessage = ref('')
const alertTitle   = ref('Summary Failed')

function showAlert(msg: string, title = 'Summary Failed') {
  alertTitle.value   = title
  alertMessage.value = msg
  alertVisible.value = true
}

// ── SRS-5.1.2 / 5.1.3: content-availability check ───────────────────
const hasNotes = computed(() => props.notesContent.trim().length > 0)

const hasContent = computed(() => {
  if (selectedSource.value === 'pdf')   return props.pdfAvailable
  if (selectedSource.value === 'notes') return hasNotes.value
  // 'both' — ตาม UC-005 2E: error เฉพาะกรณีทั้งสอง source ว่างพร้อมกัน
  return props.pdfAvailable || hasNotes.value
})

const generateDisabled = computed(
  () => status.value === 'loading' || status.value === 'reading-pdf' || !hasContent.value
)

// ── ประกอบ text จริงตาม source ที่เลือก ──────────────────────────────
async function buildSourceText(): Promise<string> {
  const notes = props.notesContent.trim()

  const needsPdf = selectedSource.value !== 'notes' && props.pdfAvailable
  let pdfText = ''
  if (needsPdf) {
    status.value = 'reading-pdf'
    pdfText = (await props.getPdfText()).trim()
  }

  if (selectedSource.value === 'pdf')   return pdfText
  if (selectedSource.value === 'notes') return notes
  return [pdfText, notes].filter(Boolean).join('\n\n---\n\n')
}

// ── Generate — SRS-5.1.4 / 5.1.5 / 5.1.6 ─────────────────────────────
async function handleGenerate() {
  // SRS-5.1.3 — ว่าง → error, abort ก่อนเรียก API
  if (!hasContent.value) {
    showAlert('The selected source has no content to summarize.', 'Nothing to Summarize')
    return
  }

  status.value = 'loading'

 try {
    const sourceText = await buildSourceText()
    status.value = 'loading'

    const summary = await summarizeContent(selectedSource.value, sourceText)

    status.value = 'success'
    emit('summary-generated', `\n## Summary\n\n${summary}\n`)
    setTimeout(() => { status.value = 'idle' }, 3000)
  } catch (err) {
    status.value = 'error'
    const msg = err instanceof SummaryError
      ? (err as SummaryError).message
      : 'Summary generation failed. Please try again.'
    showAlert(msg, 'Summary Failed')
  }
}
</script>

<template>
  <div class="asp">
    <div class="asp__header">
      <span class="asp__title">📝 AI Summarization</span>

      <!-- Source selector -->
      <div class="asp__sources">
        <button
          v-for="opt in SOURCE_OPTIONS"
          :key="opt.value"
          class="asp__source-btn"
          :class="{ 'asp__source-btn--active': selectedSource === opt.value }"
          @click="selectedSource = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="asp__body">
      <div class="asp__icon-wrap">
        <span class="asp__icon">🧠</span>
      </div>

      <p class="asp__desc">
        Generate an AI summary from your {{ selectedSource === 'both' ? 'PDF and notes' : selectedSource === 'pdf' ? 'PDF' : 'notes' }}.
      </p>

      <button
        class="asp__generate-btn"
        :disabled="generateDisabled"
        @click="handleGenerate"
      >
       {{ status === 'reading-pdf' ? 'Reading PDF…' : status === 'loading' ? 'Summarizing…' : 'Generate Summary' }}
      </button>
      <div v-if="status === 'reading-pdf'" class="asp__msg asp__msg--loading">
        📄 Extracting PDF text…
      </div>
      <div v-if="status === 'loading'" class="asp__msg asp__msg--loading">
        ⏳ Sending to Gemini…
      </div>
      <transition name="fade">
        <div v-if="status === 'success'" class="asp__msg asp__msg--success">
          ✓ Summary Inserted
        </div>
      </transition>
    </div>

    <!-- Alert Dialog -->
    <AlertDialog
      :visible="alertVisible"
      :title="alertTitle"
      :message="alertMessage"
      type="error"
      @close="alertVisible = false"
    />
  </div>
</template>

<style scoped>
.asp {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-pane);
}

.asp__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-toolbar);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.asp__title {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  white-space: nowrap;
}

/* Source selector — mirrors ImageEmbedPanel's size selector */
.asp__sources {
  display: flex;
  gap: 4px;
}

.asp__source-btn {
  background: var(--cream-dark);
  border: 1.5px solid var(--cream-mid);
  border-radius: 6px;
  padding: 3px 12px;
  font-size: 0.75rem;
  font-family: var(--font-sans);
  color: var(--text-mid);
  cursor: pointer;
  transition: background .15s, border-color .15s, color .15s;
}

.asp__source-btn:hover {
  background: var(--green-pale);
  border-color: var(--green-light);
  color: var(--green-deep);
}

.asp__source-btn--active {
  background: var(--green-deep);
  border-color: var(--green-deep);
  color: var(--cream);
}

.asp__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

.asp__icon-wrap {
  width: 64px;
  height: 64px;
  background: var(--cream-dark);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.asp__icon { font-size: 2rem; }

.asp__desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  text-align: center;
  max-width: 260px;
  line-height: 1.6;
}

.asp__generate-btn {
  background: var(--color-btn-bg);
  color: var(--cream);
  border: none;
  border-radius: var(--border-radius);
  padding: 7px 22px;
  font-size: var(--font-size-sm);
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background .2s, opacity .2s;
}
.asp__generate-btn:hover:not(:disabled) { background: var(--color-btn-hover); }
.asp__generate-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.asp__msg {
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
.asp__msg--success {
  background: #e6f4e3;
  color: var(--green-deep);
}

.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>