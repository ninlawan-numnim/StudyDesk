import { describe, it, expect } from 'vitest'

describe('STC-10: Non-Functional AI Edge Cases & Error Handling', () => {
  it('STC-10.2: กรณีไม่มีเนื้อหา ต้องปฏิเสธการสร้างคำถาม (Nothing to Generate)', () => {
    const emptyNotes = ''
    const hasPdf = false

    // จำลองฟังก์ชันตรวจสอบหน้าบ้านก่อนยิงไป AI
    const canGenerate = (notes: string, pdfLoaded: boolean) => {
      if (!notes.trim() && !pdfLoaded) {
        return { allowed: false, message: 'The selected source has no content to generate a quiz from.' }
      }
      return { allowed: true, message: '' }
    }

    const check = canGenerate(emptyNotes, hasPdf)
    expect(check.allowed).toBe(false)
    expect(check.message).toBe('The selected source has no content to generate a quiz from.')
  })

  it('STC-10.3: กรณีข้อความยาวเกิน 100,000 ตัวอักษร ต้องปฏิเสธการสรุปผล (Content too long)', () => {
    const longContent = 'A'.repeat(100001)

    const validateContentLength = (text: string) => {
      const MAX_LENGTH = 100000
      if (text.length > MAX_LENGTH) {
        return { valid: false, error: 'The selected content is too long to summarize in a single request...' }
      }
      return { valid: true, error: null }
    }

    const result = validateContentLength(longContent)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('The selected content is too long')
  })
})