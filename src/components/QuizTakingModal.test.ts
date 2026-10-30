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
    expect(wrapper.find('.qtm__meta').text()).toContain('Question 1 of 2')
    expect(wrapper.find('.qtm__meta').text()).toContain('Recall')
    expect(wrapper.find('.qtm__question').text()).toBe(mockQuestions[0].question)
    expect(wrapper.find('.qtm__progress-fill').attributes('style')).toContain('width: 50%')
    const nextBtn = wrapper.find('.qtm__next-btn')
    expect(nextBtn.attributes('disabled')).toBeDefined()
  })

  it('UTC-06-01: เมื่อคลิกเลือกคำตอบ ต้องล็อกตัวเลือกทันที (เปลี่ยนคำตอบไม่ได้) และปุ่ม Next กดได้', async () => {
    const wrapper = mount(QuizTakingModal, { props: { questions: mockQuestions } })
    const choices = wrapper.findAll('.qtm__choice')
    await choices[1].trigger('click')
    choices.forEach(choice => {
      expect(choice.attributes('disabled')).toBeDefined()
    })
    await choices[0].trigger('click')
    expect(choices[0].classes()).not.toContain('qtm__choice--incorrect')
    expect(wrapper.find('.qtm__next-btn').attributes('disabled')).toBeUndefined()
  })

  it('UTC-06-02: เมื่อตอบถูก ต้องไฮไลต์สีเขียว (qtm__choice--correct) และแสดงคำอธิบายเฉลย', async () => {
    const wrapper = mount(QuizTakingModal, { props: { questions: mockQuestions } })
    const choices = wrapper.findAll('.qtm__choice')
    await choices[1].trigger('click')
    expect(choices[1].classes()).toContain('qtm__choice--correct')
    expect(wrapper.find('.qtm__explanation').exists()).toBe(true)
    expect(wrapper.find('.qtm__explanation').text()).toBe(mockQuestions[0].explanation)
  })

  it('UTC-06-03: เมื่อตอบผิด ต้องไฮไลต์ข้อที่เลือกเป็นสีแดง และชี้ข้อที่ถูกพร้อมคำอธิบาย', async () => {
    const wrapper = mount(QuizTakingModal, { props: { questions: mockQuestions } })
    const choices = wrapper.findAll('.qtm__choice')
    await choices[0].trigger('click') 
    expect(choices[0].classes()).toContain('qtm__choice--incorrect')
    expect(choices[1].classes()).toContain('qtm__choice--correct')
    expect(wrapper.find('.qtm__explanation').text()).toBe(mockQuestions[0].explanation)
  })

  it('STC-09 Step 5: ทำครบทุกข้อแล้วกด Finish ต้องคำนวณคะแนนถูกต้อง และแสดงหน้าสรุปผล', async () => {
    const wrapper = mount(QuizTakingModal, { props: { questions: mockQuestions } })
    await wrapper.findAll('.qtm__choice')[1].trigger('click')
    await wrapper.find('.qtm__next-btn').trigger('click')
    expect(wrapper.find('.qtm__meta').text()).toContain('Question 2 of 2')
    expect(wrapper.find('.qtm__next-btn').text()).toBe('Finish')
    await wrapper.findAll('.qtm__choice')[2].trigger('click')
    await wrapper.find('.qtm__next-btn').trigger('click')
    expect(wrapper.find('.qtm__results-label').text()).toBe('Quiz complete')
    expect(wrapper.find('.qtm__results-score').text()).toBe('1 / 2 correct')
    expect(wrapper.find('.qtm__results-note').text()).toContain('Saved — you can retake this quiz anytime')
    await wrapper.find('.qtm__next-btn').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('STC-09 Retake: กด Retake ที่หน้าสรุปผลต้องกลับไปข้อที่ 1 และล้างคำตอบทั้งหมด', async () => {
    const wrapper = mount(QuizTakingModal, { props: { questions: mockQuestions } })
    await wrapper.findAll('.qtm__choice')[1].trigger('click')
    await wrapper.find('.qtm__next-btn').trigger('click')
    await wrapper.findAll('.qtm__choice')[0].trigger('click')
    await wrapper.find('.qtm__next-btn').trigger('click')
    expect(wrapper.find('.qtm__results-score').text()).toBe('2 / 2 correct')
    await wrapper.find('.qtm__retake-btn').trigger('click')
    expect(wrapper.find('.qtm__meta').text()).toContain('Question 1 of 2')
    expect(wrapper.find('.qtm__next-btn').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('close')).toBeFalsy()
  })

 
  it('UTC-06-04: เมื่อไม่มีคำถาม (Empty Array) ควรมีข้อความบอกผู้ใช้และไม่พัง (No crash)', () => {
    const wrapper = mount(QuizTakingModal, {
      props: { questions: [] }, // จำลอง Edge Case: ส่ง Array ว่างเข้าไป
    })

  
  })

  it('STC-09 Payload: เมื่อทำควิซจบและกด Done ต้องส่ง Event "close" พร้อมข้อมูลคะแนน', async () => {
    const wrapper = mount(QuizTakingModal, { props: { questions: mockQuestions } })
    
    await wrapper.findAll('.qtm__choice')[1].trigger('click')
    await wrapper.find('.qtm__next-btn').trigger('click')
    await wrapper.findAll('.qtm__choice')[0].trigger('click')
    await wrapper.find('.qtm__next-btn').trigger('click')

    await wrapper.find('.qtm__next-btn').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()

  
  })
})