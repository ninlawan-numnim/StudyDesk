<script setup lang="ts">
import { ref, computed } from 'vue'
import AlertDialog from './AlertDialog.vue'
// ⚠️ Note: You will need to create generateQuiz in your gemini service
import { generateQuiz, QuizError } from '../services/gemini'

type QuizSource = 'pdf' | 'notes' | 'both'
type QuizStyle = 'mcq' | 'tf' | 'short'

const props = defineProps<{
  pdfAvailable: boolean
  notesContent: string
  getPdfText: () => Promise<string>
}>()

const emit = defineEmits<{ 'quiz-generated': [markdown: string] }>()

// ── Selectors ────────────────────────────────────────────────────────
const SOURCE_OPTIONS = [
  { label: 'PDF',   value: 'pdf'   },
  { label: 'Notes', value: 'notes' },
  { label: 'Both',  value: 'both'  },
] as const

const COUNT_OPTIONS = [
  { label: '3', value: 3 },
  { label: '5', value: 5 },
  { label: '10', value: 10 },
] as const

const STYLE_OPTIONS = [
  { label: 'Multiple Choice', value: 'mcq' },
  { label: 'True/False', value: 'tf' },
  { label: 'Short Answer', value: 'short' },
] as const

const selectedSource = ref<QuizSource>('both')
const selectedCount = ref<number>(5)
const selectedStyle = ref<QuizStyle>('mcq')

const status = ref<'idle' | 'reading-pdf' | 'loading' | 'success' | 'error'>('idle')

// ── Alert Dialog state ───────────────────────────────────────────────
const alertVisible = ref(false)
const alertMessage = ref('')
const alertTitle   = ref('Quiz Failed')

function showAlert(msg: string, title = 'Quiz Failed') {
  alertTitle.value   = title
  alertMessage.value = msg
  alertVisible.value = true
}

// ── content-availability check ──────────────────────────────────────
const hasNotes = computed(() => props.notesContent.trim().length > 0)

const hasContent = computed(() => {
  if (selectedSource.value === 'pdf')   return props.pdfAvailable
  if (selectedSource.value === 'notes') return hasNotes.value
  return props.pdfAvailable || hasNotes.value
})

const generateDisabled = computed(
  () => status.value === 'loading' || status.value === 'reading-pdf' || !hasContent.value
)

function stripEmbeddedImages(markdown: string): string {
  return markdown.replace(/<img[^>]*src=["']data:[^"']*["'][^>]*>/gi, '[Embedded Image]')
}

async function buildSourceText(): Promise<string> {
  const notes = stripEmbeddedImages(props.notesContent).trim()

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

// ── Generate ─────────────────────────────────────────────────────────
async function handleGenerate() {
  if (!hasContent.value) {
    showAlert('The selected source has no content to generate a quiz.', 'Nothing to Read')
    return
  }

  status.value = 'loading'

  try {
    const sourceText = await buildSourceText()
    status.value = 'loading'

    // Pass the new selector values into the API function
    const quiz = await generateQuiz(
      selectedSource.value, 
      sourceText, 
      selectedCount.value, 
      selectedStyle.value
    )

    status.value = 'success'
    emit('quiz-generated', `\n## Quiz\n\n${quiz}\n`)
    setTimeout(() => { status.value = 'idle' }, 3000)
  } catch (err) {
    status.value = 'error'
    const msg = err instanceof QuizError
      ? (err as QuizError).message
      : 'Quiz generation failed. Please try again.'
    showAlert(msg, 'Quiz Failed')
  }
}
</script>

<template>
  <div class="aqp">
    <div class="aqp__header">
      <span class="aqp__title">🎯 AI Quiz Generator</span>
      
      <div class="aqp__selectors">
        <!-- Source selector -->
        <div class="aqp__pill-group">
          <button
            v-for="opt in SOURCE_OPTIONS"
            :key="opt.value"
            class="aqp__pill-btn"
            :class="{ 'aqp__pill-btn--active': selectedSource === opt.value }"
            @click="selectedSource = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        
        <div class="aqp__divider"></div>

        <!-- Count selector -->
        <div class="aqp__pill-group">
          <button
            v-for="opt in COUNT_OPTIONS"
            :key="opt.value"
            class="aqp__pill-btn"
            :class="{ 'aqp__pill-btn--active': selectedCount === opt.value }"
            @click="selectedCount = opt.value"
          >
            {{ opt.label }} Items
          </button>
        </div>

        <div class="aqp__divider"></div>

        <!-- Style selector -->
        <div class="aqp__pill-group">
          <button
            v-for="opt in STYLE_OPTIONS"
            :key="opt.value"
            class="aqp__pill-btn"
            :class="{ 'aqp__pill-btn--active': selectedStyle === opt.value }"
            @click="selectedStyle = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="aqp__body">
      <div class="aqp__icon-wrap">
        <span class="aqp__icon">🧠</span>
      </div>

      <p class="aqp__desc">
        Generate a {{ selectedCount }}-question {{ STYLE_OPTIONS.find(s => s.value === selectedStyle)?.label }} quiz from your {{ selectedSource === 'both' ? 'PDF and notes' : selectedSource === 'pdf' ? 'PDF' : 'notes' }}.
      </p>

      <button
        class="aqp__generate-btn"
        :disabled="generateDisabled"
        @click="handleGenerate"
      >
       {{ status === 'reading-pdf' ? 'Reading PDF…' : status === 'loading' ? 'Generating Quiz…' : 'Generate Quiz' }}
      </button>
      <div v-if="status === 'reading-pdf'" class="aqp__msg aqp__msg--loading">
        📄 Extracting PDF text…
      </div>
      <div v-if="status === 'loading'" class="aqp__msg aqp__msg--loading">
        ⏳ Sending to Gemini…
      </div>
      <transition name="fade">
        <div v-if="status === 'success'" class="aqp__msg aqp__msg--success">
          ✓ Quiz Inserted
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
/* 
  Replaced all .asp (Ai Summary Panel) classes with .aqp (Ai Quiz Panel).
  The header has been changed to flex-direction: column to stack the title
  above the new, wider row of pill selectors.
*/
.aqp {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-pane);
}

.aqp__header {
  display: flex;
  flex-direction: column; 
  gap: 12px;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-toolbar);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.aqp__title {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  white-space: nowrap;
  font-weight: 600;
}

.aqp__selectors {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.aqp__pill-group {
  display: flex;
  gap: 4px;
}

.aqp__divider {
  width: 1px;
  height: 16px;
  background-color: var(--color-divider);
  margin: 0 4px;
}

.aqp__pill-btn {
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

.aqp__pill-btn:hover {
  background: var(--green-pale);
  border-color: var(--green-light);
  color: var(--green-deep);
}

.aqp__pill-btn--active {
  background: var(--green-deep);
  border-color: var(--green-deep);
  color: var(--cream);
}

.aqp__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

.aqp__icon-wrap {
  width: 64px;
  height: 64px;
  background: var(--cream-dark);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.aqp__icon { font-size: 2rem; }

.aqp__desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  text-align: center;
  max-width: 280px;
  line-height: 1.6;
}

.aqp__generate-btn {
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
.aqp__generate-btn:hover:not(:disabled) { background: var(--color-btn-hover); }
.aqp__generate-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.aqp__msg {
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
.aqp__msg--success {
  background: #e6f4e3;
  color: var(--green-deep);
}

.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>