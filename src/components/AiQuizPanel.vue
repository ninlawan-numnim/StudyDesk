<!-- src/components/AiQuizPanel.vue -->
<!-- Feature 7: AI Quiz Generator — Settings UI                        -->
<!-- SRS-7.1.1: source / question count / style selectors              -->
<!-- SRS-7.1.2: validate selected source has content before API        -->
<!-- SRS-7.1.9: specific error message on failure                      -->
<!-- NOTE: actual Gemini call is stubbed in services/gemini.ts for now -->
<!--       (Step 3 — Service Layer will replace the stub body)         -->
<!-- NOTE: on success this panel just emits 'quiz-generated' — the     -->
<!--       quiz-taking modal (Step 4) and SQLite save (Step 2/5) are   -->
<!--       wired in by the parent, not by this panel                  -->

<script setup lang="ts">
import { ref, computed } from 'vue'
import AlertDialog from './AlertDialog.vue'
import {
  generateQuiz,
  QuizError,
  type QuizSource,
  type QuizCount,
  type QuizStyle,
  type QuizQuestion,
} from '../services/gemini'

const props = defineProps<{
  pdfAvailable: boolean
  notesContent: string
  getPdfText: () => Promise<string>
}>()

const emit = defineEmits<{ 'quiz-generated': [questions: QuizQuestion[], style: QuizStyle] }>()

// ── SRS-7.1.1: settings ──────────────────────────────────────────────
const SOURCE_OPTIONS = [
  { label: 'Both',  value: 'both'  },
  { label: 'PDF',   value: 'pdf'   },
  { label: 'Notes', value: 'notes' },
] as const

const COUNT_OPTIONS: QuizCount[] = [5, 10, 20]

const STYLE_OPTIONS = [
  { label: 'Recall',       value: 'recall'        },
  { label: 'Understand',   value: 'understanding'  },
  { label: 'Application',  value: 'application'    },
  { label: 'Mixed',        value: 'mixed'          },
] as const

const selectedSource = ref<QuizSource>('both')
const selectedCount  = ref<QuizCount>(10)
const selectedStyle  = ref<QuizStyle>('mixed')

const status = ref<'idle' | 'reading-pdf' | 'loading' | 'error'>('idle')

// ── Alert Dialog state ───────────────────────────────────────────────
const alertVisible = ref(false)
const alertMessage = ref('')
const alertTitle   = ref('Quiz Generation Failed')

function showAlert(msg: string, title = 'Quiz Generation Failed') {
  alertTitle.value   = title
  alertMessage.value = msg
  alertVisible.value = true
}

// ── SRS-7.1.2: content-availability check (mirrors AiSummaryPanel) ──
const hasNotes = computed(() => props.notesContent.trim().length > 0)

const hasContent = computed(() => {
  if (selectedSource.value === 'pdf')   return props.pdfAvailable
  if (selectedSource.value === 'notes') return hasNotes.value
  return props.pdfAvailable || hasNotes.value
})

const generateDisabled = computed(
  () => status.value === 'loading' || status.value === 'reading-pdf' || !hasContent.value
)

// ตัด base64 image data-URI ออกก่อนส่ง (เหมือน AiSummaryPanel)
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

// ── Generate — SRS-7.1.2 ~ 7.1.4, 7.1.9 ──────────────────────────────
async function handleGenerate() {
  if (!hasContent.value) {
    showAlert('The selected source has no content to generate a quiz from.', 'Nothing to Generate')
    return
  }

  try {
    const sourceText = await buildSourceText()
    status.value = 'loading'

    const questions = await generateQuiz(
      selectedSource.value,
      selectedCount.value,
      selectedStyle.value,
      sourceText
    )

    status.value = 'idle'
    emit('quiz-generated', questions, selectedStyle.value)
  } catch (err) {
    status.value = 'error'
    const msg = err instanceof QuizError
      ? err.message
      : 'Quiz generation failed. Please try again.'
    showAlert(msg, 'Quiz Generation Failed')
  }
}
</script>

<template>
  <div class="aqp">
    <div class="aqp__header">
      <span class="aqp__title">🧩 AI Quiz Generator</span>

      <div class="aqp__sources">
        <button
          v-for="opt in SOURCE_OPTIONS"
          :key="opt.value"
          class="aqp__pill"
          :class="{ 'aqp__pill--active': selectedSource === opt.value }"
          @click="selectedSource = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="aqp__body">
      <div class="aqp__settings-row">
        <div class="aqp__setting-group">
          <p class="aqp__setting-label">Question count</p>
          <div class="aqp__pills">
            <button
              v-for="n in COUNT_OPTIONS"
              :key="n"
              class="aqp__pill"
              :class="{ 'aqp__pill--active': selectedCount === n }"
              @click="selectedCount = n"
            >
              {{ n }}
            </button>
          </div>
        </div>

        <div class="aqp__setting-group">
          <p class="aqp__setting-label">Style</p>
          <div class="aqp__pills">
            <button
              v-for="opt in STYLE_OPTIONS"
              :key="opt.value"
              class="aqp__pill"
              :class="{ 'aqp__pill--active': selectedStyle === opt.value }"
              @click="selectedStyle = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <button
        class="aqp__generate-btn"
        :disabled="generateDisabled"
        @click="handleGenerate"
      >
        {{ status === 'reading-pdf' ? 'Reading PDF…' : status === 'loading' ? 'Generating Quiz…' : 'Generate Quiz' }}
      </button>

      <div v-if="status === 'reading-pdf'" class="aqp__msg">
        📄 Extracting PDF text…
      </div>
      <div v-if="status === 'loading'" class="aqp__msg">
        ⏳ Sending to Gemini…
      </div>
    </div>

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
.aqp {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-pane);
}

.aqp__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-toolbar);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.aqp__title {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  white-space: nowrap;
}

.aqp__sources,
.aqp__pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.aqp__pill {
  background: var(--cream-dark);
  border: 1.5px solid var(--cream-mid);
  border-radius: 6px;
  padding: 3px 12px;
  font-size: 0.75rem;
  font-family: var(--font-sans);
  color: var(--text-mid);
  cursor: pointer;
  white-space: nowrap;
  transition: background .15s, border-color .15s, color .15s;
}
.aqp__pill:hover {
  background: var(--green-pale);
  border-color: var(--green-light);
  color: var(--green-deep);
}
.aqp__pill--active {
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

.aqp__settings-row {
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
  justify-content: center;
}

.aqp__setting-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-family: var(--font-sans);
  margin-bottom: 6px;
  text-align: center;
}

.aqp__generate-btn {
  background: var(--color-btn-bg);
  color: var(--cream);
  border: none;
  border-radius: var(--border-radius);
  padding: 7px 26px;
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
  font-size: var(--font-size-sm);
  font-family: var(--font-sans);
  font-weight: 600;
  color: var(--text-mid);
}
</style>