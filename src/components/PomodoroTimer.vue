<!-- src/components/PomodoroTimer.vue -->
<!-- Feature 6: Pomodoro Study Timer          -->
<!-- SRS-6.1.1: Work 25 min / Break 5 min     -->
<!-- SRS-6.1.2: emit interval-complete → DB   -->

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import tomatoIcon from '../assets/tomato.png'

defineProps<{ sessionId: number | null }>()

const emit = defineEmits<{
  (e: 'interval-complete', mins: number): void
  (e: 'show-toast', message: string): void
}>()

type Mode = 'work' | 'break'

const mode        = ref<Mode>('work')
const isRunning   = ref(false)
const secondsLeft = ref(25 * 60)

let ticker: ReturnType<typeof setInterval> | null = null

const display = computed(() => {
  const m = Math.floor(secondsLeft.value / 60).toString().padStart(2, '0')
  const s = (secondsLeft.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

const modeLabel = computed(() => mode.value === 'work' ? 'Focus' : 'Break')

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
  mode.value        = 'work'
  secondsLeft.value = 25 * 60
}

function tick() {
  if (secondsLeft.value <= 0) { onIntervalEnd(); return }
  secondsLeft.value--
}

function onIntervalEnd() {
  pause()
  if (mode.value === 'work') {
    emit('interval-complete', 25)
    emit('show-toast', 'Work done — time for a break!')
    mode.value        = 'break'
    secondsLeft.value = 5 * 60
  } else {
    mode.value        = 'work'
    secondsLeft.value = 25 * 60
  }
}

onUnmounted(() => { if (ticker) clearInterval(ticker) })
</script>

<template>
  <!-- ── Idle: ยังไม่ได้กด Start ── -->
  <div v-if="!isRunning && secondsLeft === 25 * 60 && mode === 'work'" class="pomo pomo--idle">
    <img :src="tomatoIcon" class="pomo__icon" alt="pomodoro" />
    <span class="pomo__label">Pomodoro Timer</span>
    <button class="pomo__btn-start" @click="start">Start</button>
  </div>

  <!-- ── Active / Paused ── -->
  <div v-else class="pomo pomo--active">
    <img :src="tomatoIcon" class="pomo__icon pomo__icon--sm" alt="pomodoro"
         :style="{ opacity: isRunning ? 1 : 0.5 }" />
    <span class="pomo__mode">{{ modeLabel }}</span>
    <span class="pomo__time">{{ display }}</span>
    <div class="pomo__controls">
      <button v-if="isRunning" class="pomo__ctrl pomo__ctrl--pause"  @click="pause">Pause</button>
      <button v-else           class="pomo__ctrl pomo__ctrl--resume" @click="start">Resume</button>
      <button                  class="pomo__ctrl pomo__ctrl--reset"  @click="reset">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.pomo {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Idle ── */
.pomo--idle { gap: 8px; }

.pomo__icon {
  width: 30px;
  height: 30px;
  object-fit: contain;
  flex-shrink: 0;
}
.pomo__icon--sm {
  width: 26px;
  height: 26px;
  transition: opacity .3s;
}

.pomo__label {
  font-size: .85rem;
  font-family: var(--font-sans);
  color: var(--cream);
  opacity: .9;
  white-space: nowrap;
  letter-spacing: .01em;
}

.pomo__btn-start {
  background: var(--cream);
  color: var(--green-deep);
  border: none;
  border-radius: 12px;
  padding: 5px 18px;
  font-size: .82rem;
  font-family: var(--font-sans);
  font-weight: 700;
  cursor: pointer;
  letter-spacing: .02em;
  transition: opacity .15s, transform .1s;
  box-shadow: 0 1px 4px rgba(0,0,0,.2);
}
.pomo__btn-start:hover {
  opacity: .88;
  transform: translateY(-1px);
}

/* ── Active ── */
.pomo--active {
  background: rgba(0,0,0,.22);
  border: 1px solid rgba(200,223,196,.15);
  border-radius: 20px;
  padding: 5px 14px 5px 10px;
  gap: 8px;
}

.pomo__mode {
  font-size: .78rem;
  font-family: var(--font-sans);
  color: var(--green-pale);
  letter-spacing: .06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.pomo__time {
  font-size: 1.1rem;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--cream);
  letter-spacing: .06em;
  min-width: 52px;
  text-align: center;
}

.pomo__controls {
  display: flex;
  gap: 4px;
}

.pomo__ctrl {
  border: none;
  border-radius: 10px;
  padding: 4px 11px;
  font-size: .75rem;
  font-family: var(--font-sans);
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s, transform .1s;
  white-space: nowrap;
}
.pomo__ctrl:hover {
  opacity: .82;
  transform: translateY(-1px);
}

.pomo__ctrl--pause  { background: #e8c84a; color: #2a1e00; }
.pomo__ctrl--resume { background: #a8c9a0; color: #0f2a0a; }
.pomo__ctrl--reset  { background: rgba(255,255,255,.13); color: var(--cream); }
</style>