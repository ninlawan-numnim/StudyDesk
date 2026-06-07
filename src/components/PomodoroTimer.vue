<!-- src/components/PomodoroTimer.vue -->
<!-- Feature 6: Pomodoro Study Timer -->
<!-- SRS-6.1.1: Work 25 min / Break 5 min state machine -->
<!-- SRS-6.1.2: emit interval-complete → parent logs to DB -->

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps<{
  sessionId: number | null
}>()

const emit = defineEmits<{
  (e: 'interval-complete', mins: number): void
}>()

// ── State machine ─────────────────────────────────────
type Mode = 'work' | 'break'

const mode        = ref<Mode>('work')
const isRunning   = ref(false)
const secondsLeft = ref(25 * 60)   // เริ่มต้น Work 25 นาที

let ticker: ReturnType<typeof setInterval> | null = null

// ── Computed display ──────────────────────────────────
const display = computed(() => {
  const m = Math.floor(secondsLeft.value / 60).toString().padStart(2, '0')
  const s = (secondsLeft.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

const modeLabel = computed(() => mode.value === 'work' ? 'Work' : 'Break')

// ── Controls ──────────────────────────────────────────
function start() {
  if (isRunning.value) return
  isRunning.value = true
  ticker = setInterval(tick, 1000)
}

function pause() {
  isRunning.value = false
  if (ticker) { clearInterval(ticker); ticker = null }
}

function reset() {
  pause()
  // reset กลับ Work เสมอ — ไม่ log (SRS UC-006 Alternative Flow)
  mode.value        = 'work'
  secondsLeft.value = 25 * 60
}

function tick() {
  if (secondsLeft.value <= 0) {
    onIntervalEnd()
    return
  }
  secondsLeft.value--
}

function onIntervalEnd() {
  pause()

  if (mode.value === 'work') {
    // SRS-6.1.2: log เฉพาะ work interval ที่ครบ 25 นาที
    emit('interval-complete', 25)

    // เปลี่ยนเป็น Break
    mode.value        = 'break'
    secondsLeft.value = 5 * 60
  } else {
    // Break จบ → กลับ Work
    mode.value        = 'work'
    secondsLeft.value = 25 * 60
  }
}

onUnmounted(() => {
  if (ticker) clearInterval(ticker)
})
</script>

<template>
  <div class="pomodoro" :class="`pomodoro--${mode}`">
    <span class="pomodoro__mode">{{ modeLabel }}</span>
    <span class="pomodoro__display">{{ display }}</span>
    <div class="pomodoro__controls">
      <button
        v-if="!isRunning"
        class="pomodoro__btn pomodoro__btn--start"
        @click="start"
      >Start</button>
      <button
        v-else
        class="pomodoro__btn pomodoro__btn--pause"
        @click="pause"
      >Pause</button>
      <button
        class="pomodoro__btn pomodoro__btn--reset"
        @click="reset"
      >Reset</button>
    </div>
  </div>
</template>

<style scoped>
.pomodoro {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,0,0,.15);
  border-radius: 20px;
  padding: 3px 12px 3px 10px;
  transition: background .3s;
}
.pomodoro--break {
  background: rgba(100,180,80,.25);
}

.pomodoro__mode {
  font-size: .68rem;
  font-family: var(--font-sans);
  color: var(--green-pale);
  text-transform: uppercase;
  letter-spacing: .06em;
  min-width: 32px;
}

.pomodoro__display {
  font-size: .95rem;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--cream);
  letter-spacing: .05em;
  min-width: 48px;
  text-align: center;
}

.pomodoro__controls {
  display: flex;
  gap: 4px;
}

.pomodoro__btn {
  border: none;
  border-radius: 10px;
  padding: 2px 9px;
  font-size: .72rem;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: opacity .15s;
}
.pomodoro__btn:hover { opacity: .8; }

.pomodoro__btn--start {
  background: var(--green-pale);
  color: var(--green-deep);
  font-weight: 600;
}
.pomodoro__btn--pause {
  background: #d4a843;
  color: #1a1000;
  font-weight: 600;
}
.pomodoro__btn--reset {
  background: transparent;
  color: var(--green-pale);
  border: 1px solid rgba(200,223,196,.35);
}
</style>