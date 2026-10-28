// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ImageEmbedPanel from './ImageEmbedPanel.vue'
import AlertDialog from './AlertDialog.vue'

describe('STC-04 & UTC-05: Visual Reference Embedding (ImageEmbedPanel)', () => {
  it('STC-04 Step 1 & 2 (UTC-05-01): แสดงองค์ประกอบครบ และขนาดเริ่มต้นต้องเป็น Medium (400px)', () => {
    const wrapper = mount(ImageEmbedPanel)

    // ตรวจสอบข้อความบนหน้าจอตาม Step 1
    expect(wrapper.text()).toContain('Drag and drop HERE')
    expect(wrapper.find('.iep__upload-btn').text()).toBe('Upload from device')

    // ตรวจสอบว่าปุ่ม Medium (400px) ถูกเลือกเป็นค่าเริ่มต้น (มี class active)
    const buttons = wrapper.findAll('.iep__size-btn')
    expect(buttons).toHaveLength(3)
    expect(buttons[1].text()).toContain('Medium')
    expect(buttons[1].text()).toContain('400px')
    expect(buttons[1].classes()).toContain('iep__size-btn--active')
  })

  it('STC-04 Step 3 & 6 (UTC-05-02, 05-03): คลิกเปลี่ยนขนาดเป็น Small (200px) และ Large (700px) ได้', async () => {
    const wrapper = mount(ImageEmbedPanel)
    const buttons = wrapper.findAll('.iep__size-btn')
    const smallBtn = buttons[0]
    const mediumBtn = buttons[1]
    const largeBtn = buttons[2]

    // Step 3: คลิกเลือก Small (200px)
    await smallBtn.trigger('click')
    expect(smallBtn.classes()).toContain('iep__size-btn--active')
    expect(mediumBtn.classes()).not.toContain('iep__size-btn--active')

    // Step 6: คลิกเลือก Large (700px)
    await largeBtn.trigger('click')
    expect(largeBtn.classes()).toContain('iep__size-btn--active')
    expect(smallBtn.classes()).not.toContain('iep__size-btn--active')
  })

  it('STC-04 Step 4 (UTC-05-04, 05-08): อัปโหลดไฟล์ PNG ขนาด Small แล้วส่งค่า <img> width:200px ออกไปถูกต้อง', async () => {
    const wrapper = mount(ImageEmbedPanel)

    // เลือกขนาด Small (200px)
    const smallBtn = wrapper.findAll('.iep__size-btn')[0]
    await smallBtn.trigger('click')

    // จำลองการเลือกไฟล์ .png ผ่านปุ่ม Upload
    const pngFile = new File(['dummy-image-content'], 'test_diagram.png', { type: 'image/png' })
    const fileInput = wrapper.find('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [pngFile],
      configurable: true,
    })
    await fileInput.trigger('change')

    // รอให้ FileReader แปลง Base64 เสร็จและ emit 'insert-image'
    await vi.waitFor(() => {
      expect(wrapper.emitted('insert-image')).toBeTruthy()
    })

    const emittedMarkdown = wrapper.emitted('insert-image')![0][0] as string
    expect(emittedMarkdown).toContain('<img src="data:image/png;base64,')
    expect(emittedMarkdown).toContain('alt="test_diagram.png"')
    expect(emittedMarkdown).toContain('width:200px')
  })

  it('STC-04 Step 7 (UTC-05-05, 05-07): ลากไฟล์ JPG มาวาง (Drag & Drop) ขนาด Large แล้วได้ width:700px', async () => {
    const wrapper = mount(ImageEmbedPanel)

    // เลือกขนาด Large (700px)
    const largeBtn = wrapper.findAll('.iep__size-btn')[2]
    await largeBtn.trigger('click')

    // จำลองการ Drag & Drop ไฟล์ .jpg ลงในโซน
    const jpgFile = new File(['dummy-jpg-data'], 'photo.jpg', { type: 'image/jpeg' })
    await wrapper.find('.iep__body').trigger('drop', {
      dataTransfer: { files: [jpgFile] },
    })

    await vi.waitFor(() => {
      expect(wrapper.emitted('insert-image')).toBeTruthy()
    })

    const emittedMarkdown = wrapper.emitted('insert-image')![0][0] as string
    expect(emittedMarkdown).toContain('<img src="data:image/jpeg;base64,')
    expect(emittedMarkdown).toContain('width:700px')
  })

  it('STC-04 Step 8 & 9 (UTC-05-06): อัปโหลดหรือลากไฟล์ที่ไม่รองรับ (.pdf) ต้องแสดงแจ้งเตือนและไม่แทรกรูป', async () => {
    const wrapper = mount(ImageEmbedPanel)

    // จำลองการลากไฟล์ .pdf มาวาง
    const pdfFile = new File(['dummy-pdf'], 'document.pdf', { type: 'application/pdf' })
    await wrapper.find('.iep__body').trigger('drop', {
      dataTransfer: { files: [pdfFile] },
    })

    // ต้องไม่มีการส่งอีเวนต์แทรกรูปออกไป
    expect(wrapper.emitted('insert-image')).toBeUndefined()

    // ต้องเปิด AlertDialog พร้อมข้อความตาม SRS-4.1.5
    const alertDialog = wrapper.findComponent(AlertDialog)
    expect(alertDialog.props('visible')).toBe(true)
    expect(alertDialog.props('message')).toBe('Only JPEG and PNG files are supported.')
  })
})