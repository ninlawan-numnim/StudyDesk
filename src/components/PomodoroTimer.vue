defineProps<{ sessionId: number | null }>()
defineEmits<{ (e: 'interval-complete', mins: number): void }>()