// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AiQuizPanel from './AiQuizPanel.vue'
import AlertDialog from './AlertDialog.vue'
import { generateQuiz, QuizError, type QuizQuestion } from '../services/gemini'

// จำลอง (Mock) ฟังก์ชัน generateQuiz ของ Gemini
vi.mock('../services/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/gemini')>()
  return {
    ...actual,
    generateQuiz: vi.fn(),
  }
})

const sampleQuestions: QuizQuestion[] = [
  {
    question: 'What is black-box testing?',
    choices: ['Testing internal code', 'Testing user-visible behavior', 'Database migration', 'Code linting'],
    answer: 1,
    explanation: 'Black-box testing verifies functionality against requirements without inspecting internal code.',
    difficulty: 'recall',
  },
]

describe('STC-09, ITC-06 & STC-10: AI Quiz Generator Settings & Persistence (AiQuizPanel)', () => {
  const mockSaveQuiz = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // จำลอง IPC Bridge ของ Electron สำหรับบันทึกลงฐานข้อมูล SQLite
    Object.defineProperty(window, 'ipcRenderer', {
      value: {
        saveQuiz: mockSaveQuiz.mockResolvedValue({ success: true, quiz_id: 99 }),
      },
      configurable: true,
      writable: true,
    })
  })

  it('STC-09 Step 1 & STC-10.2: เมื่อไม่มีเนื้อหาใน Source ที่เลือก ปุ่ม Generate Quiz ต้องถูกล็อก (Disabled)', () => {
    const wrapper = mount(AiQuizPanel, {
      props: {
        pdfAvailable: false,
        notesContent: '   ',
        getPdfText: vi.fn().mockResolvedValue(''),
        sessionId: 1,
      },
    })

    // ตรวจสอบค่าเริ่มต้น: Source = Both, Count = 10, Style = Mixed
    const activePills = wrapper.findAll('.aqp__pill--active')
    expect(activePills.map(p => p.text())).toEqual(['Both', '10', 'Mixed'])

    // ปุ่ม Generate Quiz ต้องกดไม่ได้และไม่ยิง API
    const generateBtn = wrapper.find('.aqp__generate-btn')
    expect(generateBtn.attributes('disabled')).toBeDefined()
    expect(generateQuiz).not.toHaveBeenCalled()
  })

  it('STC-09 Step 2 & Step 4 (ITC-06): สร้าง Quiz สำเร็จ ต้องบันทึกลง SQLite ผ่าน IPC และส่งอีเวนต์ quiz-generated', async () => {
    vi.mocked(generateQuiz).mockResolvedValue(sampleQuestions)
    const mockGetPdfText = vi.fn().mockResolvedValue('PDF lecture text')

    const wrapper = mount(AiQuizPanel, {
      props: {
        pdfAvailable: true,
        notesContent: 'Notes text <img src="data:image/png;base64,AAAA" />',
        getPdfText: mockGetPdfText,
        sessionId: 1,
      },
    })

    // กดปุ่ม Generate Quiz ด้วยค่าเริ่มต้น (Both, 10 ข้อ, Mixed)
    await wrapper.find('.aqp__generate-btn').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.emitted('quiz-generated')).toBeTruthy()
    })

    // 1. ตรวจสอบว่าส่งพารามิเตอร์ไปหา Gemini ครบถ้วน และตัดแท็กรูป base64 ออกแล้ว
    expect(generateQuiz).toHaveBeenCalledWith(
      'both',
      10,
      'mixed',
      'PDF lecture text\n\n---\n\nNotes text [Embedded Image]'
    )

    // 2. ตรวจสอบว่าสั่งบันทึกลง SQLite ผ่าน IPC (STC-09 Step 4 / ITC-06)
    expect(mockSaveQuiz).toHaveBeenCalledWith({
      session_id: 1,
      source: 'both',
      question_count: 10,
      style: 'mixed',
      questions: sampleQuestions,
    })

    // 3. ตรวจสอบว่าส่งชุดคำถามและ quiz_id (99) ไปเปิด QuizTakingModal ต่อ
    expect(wrapper.emitted('quiz-generated')![0]).toEqual([sampleQuestions, 'mixed', 99])
  })

  it('SRS-7.1.1: ผู้ใช้สามารถเปลี่ยนตั้งค่า Source, จำนวนข้อ (5/20) และรูปแบบคำถาม (Recall/Understand/Application) ได้', async () => {
    vi.mocked(generateQuiz).mockResolvedValue(sampleQuestions)

    const wrapper = mount(AiQuizPanel, {
      props: {
        pdfAvailable: false,
        notesContent: 'Only notes content',
        getPdfText: vi.fn().mockResolvedValue(''),
        sessionId: 1,
      },
    })

    const allPills = wrapper.findAll('.aqp__pill')
    const notesPill = allPills.find(p => p.text() === 'Notes')!
    const count5Pill = allPills.find(p => p.text() === '5')!
    const recallPill = allPills.find(p => p.text() === 'Recall')!

    await notesPill.trigger('click')
    await count5Pill.trigger('click')
    await recallPill.trigger('click')
    await wrapper.find('.aqp__generate-btn').trigger('click')

    await vi.waitFor(() => {
      expect(generateQuiz).toHaveBeenCalledWith('notes', 5, 'recall', 'Only notes content')
    })
  })

  it('STC-09 Step 7 & STC-10.1: เมื่อเกิด API Error หรือ JSON พัง ต้องแสดง AlertDialog และไม่บันทึกข้อมูลเสียลง SQLite', async () => {
    vi.mocked(generateQuiz).mockRejectedValue(
      new QuizError('Malformed JSON response from AI.', 'MALFORMED' as any)
    )

    const wrapper = mount(AiQuizPanel, {
      props: {
        pdfAvailable: false,
        notesContent: 'Study notes for quiz',
        getPdfText: vi.fn().mockResolvedValue(''),
        sessionId: 1,
      },
    })

    await wrapper.find('.aqp__generate-btn').trigger('click')

    await vi.waitFor(() => {
      const alert = wrapper.findComponent(AlertDialog)
      expect(alert.props('visible')).toBe(true)
    })

    // ต้องไม่บันทึกลงฐานข้อมูล และไม่เปิดหน้าทำข้อสอบ
    expect(mockSaveQuiz).not.toHaveBeenCalled()
    expect(wrapper.emitted('quiz-generated')).toBeUndefined()

    // ต้องแสดงข้อความแจ้งเตือนตามที่กำหนด
    expect(wrapper.findComponent(AlertDialog).props('title')).toBe('Quiz Generation Failed')
    expect(wrapper.findComponent(AlertDialog).props('message')).toBe('Malformed JSON response from AI.')
  })
})