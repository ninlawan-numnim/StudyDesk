<!-- src/components/QuizTakingModal.vue -->
<!-- Feature 7: AI Quiz Generator — quiz-taking UI                      -->
<!-- Full-screen modal, stepper (one question at a time), per the      -->
<!-- decisions locked in before Step 1 started:                        -->
<!--   - stepper layout, not all-questions-on-one-page                 -->
<!--   - modal/overlay, not the slim top panel (OCR/Summary use that)  -->
<!--   - score is computed client-side for this session only — no      -->
<!--     attempt-history persistence (URS-7.2 retake is out of scope)  -->

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { QuizQuestion } from '../services/gemini'

const props = defineProps<{
  questions: QuizQuestion[]
}>()

const emit = defineEmits<{ close: [] }>()

const currentIndex = ref(0)
// null = ยังไม่ได้ตอบข้อนั้น
const selectedAnswers = ref<(number | null)[]>(props.questions.map(() => null))
const phase = ref<'taking' | 'results'>('taking')

const currentQuestion = computed(() => props.questions[currentIndex.value])
const hasAnswered = computed(() => selectedAnswers.value[currentIndex.value] !== null)
const isLastQuestion = computed(() => currentIndex.value === props.questions.length - 1)

const progressPercent = computed(
  () => ((currentIndex.value + 1) / props.questions.length) * 100
)

const score = computed(
  () => selectedAnswers.value.filter((a, i) => a === props.questions[i].answer).length
)

function difficultyLabel(d: string): string {
  return d.charAt(0).toUpperCase() + d.slice(1)
}

function selectAnswer(choiceIndex: number) {
  // ล็อกคำตอบแล้ว เปลี่ยนใจไม่ได้ (เหมือนข้อสอบจริง) — กันคนกดสุ่มไปเรื่อยๆ
  if (hasAnswered.value) return
  selectedAnswers.value[currentIndex.value] = choiceIndex
}

function choiceClass(choiceIndex: number): string {
  if (!hasAnswered.value) return 'qtm__choice'
  const isCorrect  = choiceIndex === currentQuestion.value.answer
  const isSelected = choiceIndex === selectedAnswers.value[currentIndex.value]
  if (isCorrect)  return 'qtm__choice qtm__choice--correct'
  if (isSelected) return 'qtm__choice qtm__choice--incorrect'
  return 'qtm__choice qtm__choice--disabled'
}

function handleNext() {
  if (isLastQuestion.value) {
    phase.value = 'results'
    return
  }
  currentIndex.value += 1
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <div class="qtm__backdrop" @click.self="handleClose">
    <div class="qtm__card">

      <button class="qtm__close" title="Close" @click="handleClose">✕</button>

      <!-- ── Taking phase ──────────────────────────────────────── -->
      <template v-if="phase === 'taking'">
        <div class="qtm__meta">
          <span>Question {{ currentIndex + 1 }} of {{ questions.length }}</span>
          <span>{{ difficultyLabel(currentQuestion.difficulty) }}</span>
        </div>
        <div class="qtm__progress-track">
          <div class="qtm__progress-fill" :style="{ width: progressPercent + '%' }" />
        </div>

        <p class="qtm__question">{{ currentQuestion.question }}</p>

        <div class="qtm__choices">
          <button
            v-for="(choice, i) in currentQuestion.choices"
            :key="i"
            :class="choiceClass(i)"
            :disabled="hasAnswered"
            @click="selectAnswer(i)"
          >
            {{ choice }}
          </button>
        </div>

        <transition name="qtm-fade">
          <p v-if="hasAnswered" class="qtm__explanation">{{ currentQuestion.explanation }}</p>
        </transition>

        <div class="qtm__footer">
          <button
            class="qtm__next-btn"
            :disabled="!hasAnswered"
            @click="handleNext"
          >
            {{ isLastQuestion ? 'Finish' : 'Next' }}
          </button>
        </div>
      </template>

      <!-- ── Results phase ─────────────────────────────────────── -->
      <template v-else>
        <div class="qtm__results">
          <p class="qtm__results-label">Quiz complete</p>
          <p class="qtm__results-score">{{ score }} / {{ questions.length }} correct</p>
          <p class="qtm__results-note">Saved — you can retake this quiz anytime</p>
          <button class="qtm__next-btn" @click="handleClose">Done</button>
        </div>
      </template>

    </div>
  </div>
</template>

<style scoped>
.qtm__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(30, 45, 28, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  padding: 24px;
}

.qtm__card {
  position: relative;
  width: 100%;
  max-width: 560px;
  background: var(--cream);
  border: 1px solid var(--cream-mid);
  border-radius: 14px;
  padding: 28px;
  font-family: var(--font-sans);
  color: var(--text-dark);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}

.qtm__close {
  position: absolute;
  top: 14px;
  right: 14px;
  background: transparent;
  border: none;
  font-size: 1rem;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
  padding: 4px;
}
.qtm__close:hover { color: var(--text-dark); }

.qtm__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.qtm__progress-track {
  height: 5px;
  background: var(--cream-mid);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 20px;
}
.qtm__progress-fill {
  height: 100%;
  background: var(--green-mid);
  transition: width .2s ease;
}

.qtm__question {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 16px;
  line-height: 1.5;
}

.qtm__choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.qtm__choice {
  text-align: left;
  background: var(--cream-dark);
  border: 1.5px solid var(--cream-mid);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.85rem;
  font-family: var(--font-sans);
  color: var(--text-dark);
  cursor: pointer;
  transition: background .12s, border-color .12s;
}
.qtm__choice:hover:not(:disabled) {
  background: var(--green-pale);
  border-color: var(--green-light);
}
.qtm__choice--correct {
  background: var(--green-pale);
  border-color: var(--green-deep);
  border-width: 2px;
  font-weight: 600;
}
.qtm__choice--incorrect {
  background: #F5E0DE;
  border-color: var(--color-error);
  border-width: 2px;
}
.qtm__choice--disabled {
  opacity: 0.6;
  cursor: default;
}

.qtm__explanation {
  font-size: 0.8rem;
  color: var(--text-mid);
  background: var(--cream-dark);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  line-height: 1.5;
}

.qtm__footer {
  display: flex;
  justify-content: flex-end;
}

.qtm__next-btn {
  background: var(--color-btn-bg);
  color: var(--cream);
  border: none;
  border-radius: var(--border-radius);
  padding: 8px 26px;
  font-size: 0.85rem;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background .2s, opacity .2s;
}
.qtm__next-btn:hover:not(:disabled) { background: var(--color-btn-hover); }
.qtm__next-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.qtm__results {
  text-align: center;
  padding: 12px 0;
}
.qtm__results-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.qtm__results-score {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--green-deep);
  margin-bottom: 6px;
}
.qtm__results-note {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.qtm-fade-enter-active { transition: opacity .15s ease; }
.qtm-fade-enter-from { opacity: 0; }
</style>