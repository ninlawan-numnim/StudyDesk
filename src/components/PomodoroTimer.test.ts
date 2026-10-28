// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import PomodoroTimer from './PomodoroTimer.vue'

describe('STC-05: Pomodoro Study Timer (Black-Box System Test)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Step 1 & 2: เริ่มต้นแสดงป้าย Pomodoro Timer และเมื่อกด Start ต้องเริ่มนับถอยหลัง', async () => {
    const wrapper = mount(PomodoroTimer, {
      props: { sessionId: 1 }
    })

    // Step 1: ตรวจสอบหน้าจอเริ่มต้น (Idle) แสดงคำว่า Pomodoro Timer และปุ่ม Start
    expect(wrapper.text()).toContain('Pomodoro Timer')
    const startBtn = wrapper.find('.pomo__btn-start')
    expect(startBtn.exists()).toBe(true)

    // Step 2: ผู้ใช้คลิกปุ่ม Start
    await startBtn.trigger('click')

    // จำลองเวลาผ่านไป 3 วินาที
    vi.advanceTimersByTime(3000)
    await wrapper.vm.$nextTick()

    // หน้าจอต้องนับถอยหลังเป็น 24:57
    expect(wrapper.text()).toContain('24:57')
  })

  it('Step 3 & 4: เมื่อกด Pause เวลานับถอยหลังต้องหยุด และมีปุ่ม Resume ให้กดต่อ', async () => {
    const wrapper = mount(PomodoroTimer, { props: { sessionId: 1 } })
    await wrapper.find('.pomo__btn-start').trigger('click')

    vi.advanceTimersByTime(2000)
    await wrapper.vm.$nextTick()

    // Step 3: ผู้ใช้กด Pause
    const pauseBtn = wrapper.findAll('button').find(b => b.text().includes('Pause'))
    await pauseBtn?.trigger('click')

    // เวลาต้องค้างอยู่ที่ 24:58
    expect(wrapper.text()).toContain('24:58')

    // Step 4: ตรวจสอบว่าปุ่ม Resume ปรากฏขึ้นมา
    const resumeBtn = wrapper.findAll('button').find(b => b.text().includes('Resume'))
    expect(resumeBtn?.exists()).toBe(true)
  })

  it('Step 5: เมื่อกด Reset ต้องกลับสู่หน้าจอเริ่มต้น (Pomodoro Timer)', async () => {
    const wrapper = mount(PomodoroTimer, { props: { sessionId: 1 } })
    await wrapper.find('.pomo__btn-start').trigger('click')

    vi.advanceTimersByTime(5000)
    await wrapper.vm.$nextTick()

    // ผู้ใช้กด Reset
    const resetBtn = wrapper.findAll('button').find(b => b.text().includes('Reset'))
    await resetBtn?.trigger('click')

    // กลับสู่สถานะเริ่มต้น แสดงคำว่า Pomodoro Timer และปุ่ม Start
    expect(wrapper.text()).toContain('Pomodoro Timer')
    expect(wrapper.find('.pomo__btn-start').exists()).toBe(true)
  })
})