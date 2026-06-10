<!-- src/components/AlertDialog.vue -->
<!-- Reusable Alert Dialog for error / warning messages -->

<script setup lang="ts">
defineProps<{
  visible: boolean
  title?: string
  message: string
  type?: 'error' | 'warning' | 'info'
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="alert-fade">
      <div v-if="visible" class="alert-overlay" @mousedown.self="emit('close')">
        <div class="alert-dialog" :class="`alert-dialog--${type ?? 'error'}`" role="alertdialog" aria-modal="true">

          <!-- Icon -->
          <div class="alert-dialog__icon">
            <span v-if="(type ?? 'error') === 'error'">⛔</span>
            <span v-else-if="type === 'warning'">⚠️</span>
            <span v-else>ℹ️</span>
          </div>

          <!-- Content -->
          <div class="alert-dialog__content">
            <p class="alert-dialog__title">{{ title ?? (type === 'warning' ? 'คำเตือน' : 'เกิดข้อผิดพลาด') }}</p>
            <p class="alert-dialog__message">{{ message }}</p>
          </div>

          <!-- Close button -->
          <button class="alert-dialog__close" @click="emit('close')" aria-label="ปิด">✕</button>

          <!-- OK footer -->
          <div class="alert-dialog__footer">
            <button class="alert-dialog__ok" @click="emit('close')">ตกลง</button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────────── */
.alert-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* ── Dialog box ──────────────────────────────────────────────── */
.alert-dialog {
  position: relative;
  background: var(--cream);
  border-radius: 14px;
  padding: 28px 28px 20px;
  min-width: 300px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border-top: 5px solid var(--color-error);
}

.alert-dialog--warning {
  border-top-color: #c97b2a;
}

.alert-dialog--info {
  border-top-color: var(--green-mid);
}

/* ── Icon ────────────────────────────────────────────────────── */
.alert-dialog__icon {
  font-size: 2.4rem;
  line-height: 1;
}

/* ── Content ─────────────────────────────────────────────────── */
.alert-dialog__content {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.alert-dialog__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-dark);
  font-family: var(--font-sans);
}

.alert-dialog__message {
  font-size: 0.82rem;
  color: var(--text-mid);
  font-family: var(--font-sans);
  line-height: 1.6;
}

/* ── Close × button ──────────────────────────────────────────── */
.alert-dialog__close {
  position: absolute;
  top: 10px;
  right: 12px;
  background: transparent;
  border: none;
  font-size: 0.85rem;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}
.alert-dialog__close:hover {
  background: var(--cream-mid);
  color: var(--text-dark);
}

/* ── Footer OK button ────────────────────────────────────────── */
.alert-dialog__footer {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

.alert-dialog__ok {
  background: var(--color-btn-bg);
  color: var(--cream);
  border: none;
  border-radius: 20px;
  padding: 7px 36px;
  font-size: 0.82rem;
  font-family: var(--font-sans);
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}
.alert-dialog__ok:hover {
  background: var(--color-btn-hover);
}

/* ── Transition ──────────────────────────────────────────────── */
.alert-fade-enter-active,
.alert-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.alert-fade-enter-from,
.alert-fade-leave-to {
  opacity: 0;
  transform: scale(0.94);
}
</style>