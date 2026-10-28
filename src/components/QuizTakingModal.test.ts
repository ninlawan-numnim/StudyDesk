// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import QuizTakingModal from './QuizTakingModal.vue'
import type { QuizQuestion } from '../services/gemini'

const mockQuestions: QuizQuestion[] = [
  {
    question: 'What database does StudyDesk use for local persistence?',
    choices: ['MongoDB', 'SQLite', 'PostgreSQL', 'MySQL'],
    answer: 1, // SQLite
    explanation: 'StudyDesk uses SQLite to store sessions, notes, and quizzes locally.',
    difficulty: 'recall',
  },
  {
    question: 'Which process manages OS-level file dialogs in Electron?',
    choices: ['Main Process', 'Renderer Process', 'Worker Thread', 'Service Worker'],
    answer: 0, // Main Process
    explanation: 'The Electron Main Process handles native OS dialogs and SQLite operations.',
    difficulty: 'understanding',
  },
]

describe('STC-09 & UTC-06: AI Quiz Generator & Interactive Evaluation (QuizTakingModal)', () => {
  it('STC-09 Step 3: แสดงหมายเลขข้อ ป้ายระดับความยาก แถบ Progress และปุ่ม Next ต้องยังกดไม่ได้ตอนเริ่ม', () => {
    const wrapper = mount(QuizTakingModal, {
      props: { questions: mockQuestions },
    })

    // ตรวจสอบหัวข้อข้อที่ 1 และป้ายความยาก
    expect(wrapper.find('.qtm__meta').text()).toContain('Question 1 of 2')
    expect(wrapper.find('.qtm__meta').text()).toContain('Recall')
    expect(wrapper.find('.qtm__question').text()).toBe(mockQuestions[0].question)

    // แถบความคืบหน้าข้อ 1 จาก 2 ต้องอยู่ที่ 50%
    expect(wrapper.find('.qtm__progress-fill').attributes('style')).toContain('width: 50%')

    // ปุ่ม Next ต้องถูก disabled ไว้จนกว่าจะเลือกคำตอบ
    const nextBtn = wrapper.find('.qtm__next-btn')
    expect(nextBtn.attributes('disabled')).toBeDefined()
  })

  it('UTC-06-01: เมื่อคลิกเลือกคำตอบ ต้องล็อกตัวเลือกทันที (เปลี่ยนคำตอบไม่ได้) และปุ่ม Next กดได้', async () => {
    const wrapper = mount(QuizTakingModal, {
      props: { questions: mockQuestions },
    })

    const choices = wrapper.findAll('.qtm__choice')
    await choices[1].trigger('click') // เลือกตัวเลือกที่ 1 (SQLite)

    // ตัวเลือกทั้งหมดต้องถูกล็อก (disabled) ทันที
    choices.forEach(choice => {
      expect(choice.attributes('disabled')).toBeDefined()
    })

    // ลองคลิกเปลี่ยนใจไปกดตัวเลือกที่ 0 ต้องไม่เปลี่ยนผลลัพธ์
    await choices[0].trigger('click')
    expect(choices[0].classes()).not.toContain('qtm__choice--incorrect')

    // ปุ่ม Next ต้องปลดล็อกให้กดได้
    expect(wrapper.find('.qtm__next-btn').attributes('disabled')).toBeUndefined()
  })

  it('UTC-06-02: เมื่อตอบถูก ต้องไฮไลต์สีเขียว (qtm__choice--correct) และแสดงคำอธิบายเฉลย', async () => {
    const wrapper = mount(QuizTakingModal, {
      props: { questions: mockQuestions },
    })

    const choices = wrapper.findAll('.qtm__choice')
    await choices[1].trigger('click') // ตอบข้อ 1 (ถูกต้อง)

    expect(choices[1].classes()).toContain('qtm__choice--correct')
    expect(wrapper.find('.qtm__explanation').exists()).toBe(true)
    expect(wrapper.find('.qtm__explanation').text()).toBe(mockQuestions[0].explanation)
  })

  it('UTC-06-03: เมื่อตอบผิด ต้องไฮไลต์ข้อที่เลือกเป็นสีแดง (qtm__choice--incorrect) และชี้ข้อที่ถูกพร้อมคำอธิบาย', async () => {
    const wrapper = mount(QuizTakingModal, {
      props: { questions: mockQuestions },
    })

    const choices = wrapper.findAll('.qtm__choice')
    await choices[0].trigger('click') // ตอบข้อ 0 (MongoDB = ผิด)

    // ข้อที่กดต้องขึ้นสีแดง และข้อที่ถูก (ข้อ 1) ต้องขึ้นสีเขียวให้เห็น
    expect(choices[0].classes()).toContain('qtm__choice--incorrect')
    expect(choices[1].classes()).toContain('qtm__choice--correct')
    expect(wrapper.find('.qtm__explanation').text()).toBe(mockQuestions[0].explanation)
  })

  it('STC-09 Step 5: ทำครบทุกข้อแล้วกด Finish ต้องคำนวณคะแนนถูกต้อง และแสดงหน้าสรุปผล', async () => {
    const wrapper = mount(QuizTakingModal, {
      props: { questions: mockQuestions },
    })

    // ข้อที่ 1: ตอบถูก (เลือก index 1) แล้วกด Next
    await wrapper.findAll('.qtm__choice')[1].trigger('click')
    await wrapper.find('.qtm__next-btn').trigger('click')

    // เข้าสู่ข้อที่ 2 (ข้อสุดท้าย ปุ่มต้องเปลี่ยนชื่อเป็น Finish)
    expect(wrapper.find('.qtm__meta').text()).toContain('Question 2 of 2')
    expect(wrapper.find('.qtm__next-btn').text()).toBe('Finish')

    // ข้อที่ 2: ตอบผิด (เลือก index 2 แทนที่จะเป็น 0) แล้วกด Finish
    await wrapper.findAll('.qtm__choice')[2].trigger('click')
    await wrapper.find('.qtm__next-btn').trigger('click')

    // ตรวจสอบหน้าสรุปผลคะแนน (ตอบถูก 1 จาก 2 ข้อ)
    expect(wrapper.find('.qtm__results-label').text()).toBe('Quiz complete')
    expect(wrapper.find('.qtm__results-score').text()).toBe('1 / 2 correct')
    expect(wrapper.find('.qtm__results-note').text()).toContain('Saved — you can retake this quiz anytime')

    // กดปุ่ม Done ต้องส่งอีเวนต์ close ออกไป
    await wrapper.find('.qtm__next-btn').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})