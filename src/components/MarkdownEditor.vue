<script setup lang="ts">
/**
 * MarkdownEditor.vue — Renderer Process
 *
 * Markdown editor ใช้ CodeMirror 6
 * expose getCursorIndex() ให้ parent เรียกได้ — สำหรับ Feature 2 (Session Recovery)
 * expose insertAtCursor()  — สำหรับ Feature 4 (Visual Reference Embedding)
 * ใช้ defineModel สำหรับ two-way binding กับ parent
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'

// --- Two-way binding กับ parent ---
const content = defineModel<string>({ default: '' })

const editorContainerRef = ref<HTMLDivElement | null>(null)
let editorView: EditorView | null = null

// --- Get current cursor position (character index) ---
function getCursorIndex(): number {
  if (!editorView) return 0
  return editorView.state.selection.main.head
}

/**
 * insertAtCursor — Feature 4: Visual Reference Embedding
 * แทรก text ที่ตำแหน่ง cursor ปัจจุบัน แล้วเลื่อน cursor ไปหลัง text ที่แทรก
 */
function insertAtCursor(text: string): void {
  if (!editorView) return
  const pos = editorView.state.selection.main.head
  // เพิ่ม newline ก่อนและหลัง ถ้า cursor ไม่ได้อยู่ต้นบรรทัด
  const doc = editorView.state.doc.toString()
  const before = pos > 0 && doc[pos - 1] !== '\n' ? '\n' : ''
  const after  = '\n'
  const insert = `${before}${text}${after}`
  editorView.dispatch({
    changes: { from: pos, insert },
    selection: { anchor: pos + insert.length },
  })
  editorView.focus()
}

onMounted(() => {
  if (!editorContainerRef.value) return

  const startState = EditorState.create({
    doc: content.value,
    extensions: [
      basicSetup,
      markdown(),
      EditorView.theme({
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
    lineHeight: '1.7',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-muted)',
    border: 'none',
    borderRight: '1px solid var(--color-divider)',
    paddingRight: '8px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--color-bg-toolbar)',
    color: 'var(--color-text-secondary)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(94, 175, 214, 0.06)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--color-accent)',
    borderLeftWidth: '2px',
  },
  '.cm-selectionBackground, .cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(94, 175, 214, 0.18) !important',
  },
  '.cm-matchingBracket': {
    color: 'var(--color-accent) !important',
    fontWeight: 'bold',
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

defineExpose({ getCursorIndex, insertAtCursor, restoreCursor })

// restore cursor position — SRS-2.3
function restoreCursor(index: number): void {
  if (!editorView) return
  const docLength = editorView.state.doc.length
  const safeIndex = Math.min(index, docLength)
  editorView.dispatch({
    selection: { anchor: safeIndex },
  })
  editorView.focus()
}

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

.markdown-editor__container {
  flex: 1;
  overflow: hidden;
  :deep(.cm-editor) {
    height: 100%;
  }
  :deep(.cm-scroller) {
    overflow: auto;
  }
}
</style>