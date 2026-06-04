<script setup lang="ts">
/**
 * MarkdownEditor.vue — Renderer Process
 *
 * Markdown editor ใช้ CodeMirror 6
 * expose getCursorIndex() ให้ parent เรียกได้ — สำหรับ Feature 2 (Session Recovery)
 * ใช้ defineModel สำหรับ two-way binding กับ parent
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'

// --- Two-way binding กับ parent ---
const content = defineModel<string>({ default: '' })

// --- Expose cursor index ให้ parent ดึงไปเก็บ DB ใน Feature 2 ---
defineExpose({ getCursorIndex })

const editorContainerRef = ref<HTMLDivElement | null>(null)
let editorView: EditorView | null = null

// --- Get current cursor position (character index) ---
function getCursorIndex(): number {
  if (!editorView) return 0
  return editorView.state.selection.main.head
}

onMounted(() => {
  if (!editorContainerRef.value) return

  const startState = EditorState.create({
    doc: content.value,
    extensions: [
      basicSetup,
      markdown(),
      EditorView.theme({
        // Override CodeMirror default theme ให้ match กับ dark theme ของ app
        '&': {
          backgroundColor: 'var(--color-bg-pane)',
          color: 'var(--color-text-primary)',
          height: '100%',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-base)',
        },
        '.cm-content': {
          padding: 'var(--spacing-md)',
          caretColor: 'var(--color-accent)',
        },
        '.cm-gutters': {
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-muted)',
          border: 'none',
          borderRight: '1px solid var(--color-divider)',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'var(--color-bg-toolbar)',
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(137, 180, 250, 0.05)',
        },
        '.cm-cursor': {
          borderLeftColor: 'var(--color-accent)',
        },
        '.cm-selectionBackground': {
          backgroundColor: 'rgba(137, 180, 250, 0.2) !important',
        },
        '.cm-focused .cm-selectionBackground': {
          backgroundColor: 'rgba(137, 180, 250, 0.25) !important',
        },
      }),

      // Sync content กลับไปให้ parent ทุกครั้งที่ document เปลี่ยน
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          content.value = update.state.doc.toString()
        }
      }),
    ],
  })

  editorView = new EditorView({
    state: startState,
    parent: editorContainerRef.value,
  })
})

// Cleanup เมื่อ component ถูก unmount — ป้องกัน memory leak
onBeforeUnmount(() => {
  editorView?.destroy()
})

// Watch ถ้า parent เปลี่ยน content จากภายนอก (เช่น Session Recovery โหลดข้อมูลจาก DB)
// จะ sync เข้า editor โดยไม่ trigger updateListener วนซ้ำ
watch(
  () => content.value,
  (newVal) => {
    if (!editorView) return
    const currentVal = editorView.state.doc.toString()
    if (newVal !== currentVal) {
      editorView.dispatch({
        changes: { from: 0, to: currentVal.length, insert: newVal },
      })
    }
  }
)
</script>

<template>
  <div class="markdown-editor">
    <!-- Editor label -->
    <div class="markdown-editor__header">
      <span class="markdown-editor__label">📝 Notes</span>
    </div>

    <!-- CodeMirror will mount here -->
    <div ref="editorContainerRef" class="markdown-editor__container" />
  </div>
</template>

<style scoped>
.markdown-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-pane);
}

.markdown-editor__header {
  display: flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: var(--color-bg-toolbar);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.markdown-editor__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
}

/* Container ที่ CodeMirror จะ inject ตัวเองเข้ามา */
.markdown-editor__container {
  flex: 1;
  overflow: hidden;
  /* ต้องใช้ :deep() เพราะ CodeMirror inject DOM จาก JS
     ไม่ใช่ template ของเรา — scoped hash จะไม่ถูก apply อัตโนมัติ */
  :deep(.cm-editor) {
    height: 100%;
  }
  :deep(.cm-scroller) {
    overflow: auto;
  }
}
</style>