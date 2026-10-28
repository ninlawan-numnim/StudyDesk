// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AlertDialog from './AlertDialog.vue'

describe('AlertDialog Component (Error & Warning Popup)', () => {
  it('เมื่อ visible เป็น false ต้องไม่แสดงกล่องแจ้งเตือนบนหน้าจอ', () => {
    const wrapper = mount(AlertDialog, {
      props: {
        visible: false,
        message: 'Hidden message',
      },
      global: { stubs: { teleport: true } },
    })

    expect(wrapper.find('.alert-overlay').exists()).toBe(false)
  })

  it('เมื่อ visible เป็น true ต้องแสดงหัวข้อ ข้อความ และไอคอนตามประเภท (error / warning / info)', async () => {
    const wrapper = mount(AlertDialog, {
      props: {
        visible: true,
        title: 'Unsupported File',
        message: 'Only JPEG and PNG files are supported.',
        type: 'error',
      },
      global: { stubs: { teleport: true } },
    })

    expect(wrapper.find('.alert-dialog').classes()).toContain('alert-dialog--error')
    expect(wrapper.find('.alert-dialog__icon').text()).toBe('⛔')
    expect(wrapper.find('.alert-dialog__title').text()).toBe('Unsupported File')
    expect(wrapper.find('.alert-dialog__message').text()).toBe('Only JPEG and PNG files are supported.')

    // ทดสอบเปลี่ยน type เป็น warning และไม่ส่ง title มา ต้องใช้ค่าเริ่มต้นว่า Warning
    await wrapper.setProps({ title: undefined, type: 'warning' })
    expect(wrapper.find('.alert-dialog').classes()).toContain('alert-dialog--warning')
    expect(wrapper.find('.alert-dialog__icon').text()).toBe('⚠️')
    expect(wrapper.find('.alert-dialog__title').text()).toBe('Warning')
  })

  it('เมื่อคลิกปุ่ม agree, ปุ่มกากบาท (✕) หรือคลิกพื้นหลัง ต้องส่งอีเวนต์ close ออกไป', async () => {
    const wrapper = mount(AlertDialog, {
      props: {
        visible: true,
        message: 'Test closing actions',
      },
      global: { stubs: { teleport: true } },
    })

    // 1. คลิกปุ่ม agree
    await wrapper.find('.alert-dialog__ok').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    // 2. คลิกปุ่มกากบาท (✕)
    await wrapper.find('.alert-dialog__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(2)

    // 3. คลิกที่พื้นหลัง (overlay)
    await wrapper.find('.alert-overlay').trigger('mousedown')
    expect(wrapper.emitted('close')).toHaveLength(3)
  })
})