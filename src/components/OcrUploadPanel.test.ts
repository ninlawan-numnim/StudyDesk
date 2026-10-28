// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import OcrUploadPanel from './OcrUploadPanel.vue'
import AlertDialog from './AlertDialog.vue'
import { extractTextFromImage } from '../services/gemini'

// จำลอง (Mock) ฟังก์ชันยิง API ของ Gemini เพื่อไม่ให้เปลืองโควตาจริงตอนรันเทสต์
vi.mock('../services/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/gemini')>()
  return {
    ...actual,
    extractTextFromImage: vi.fn(),
  }
})

describe('STC-03 & STC-07: AI-Powered Image Text Extraction (OcrUploadPanel)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('STC-03 Step 1: แสดงหัวข้อ OCR และปุ่ม Upload from device ตอนเริ่มต้น', () => {
    const wrapper = mount(OcrUploadPanel)

    expect(wrapper.text()).toContain('OCR — Image Text Extraction')
    expect(wrapper.find('.ocr__upload-btn').text()).toBe('Upload from device')
  })

  it('STC-03 Step 5: อัปโหลดไฟล์ผิดประเภท (.pdf) ต้องแสดง AlertDialog และไม่เรียกใช้ AI', async () => {
    const wrapper = mount(OcrUploadPanel)

    const pdfFile = new File(['dummy-pdf'], 'lecture.pdf', { type: 'application/pdf' })
    const fileInput = wrapper.find('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [pdfFile],
      configurable: true,
    })
    await fileInput.trigger('change')

    expect(extractTextFromImage).not.toHaveBeenCalled()
    const alert = wrapper.findComponent(AlertDialog)
    expect(alert.props('visible')).toBe(true)
    expect(alert.props('message')).toBe('Only JPEG and PNG files are supported.')
  })

  it('STC-07-01: กรณีไม่มีอินเทอร์เน็ต (Offline) ต้องบล็อกการยิง API และแจ้งเตือนผู้ใช้', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const wrapper = mount(OcrUploadPanel)

    const pngFile = new File(['image-bytes'], 'slide.png', { type: 'image/png' })
    const fileInput = wrapper.find('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [pngFile],
      configurable: true,
    })
    await fileInput.trigger('change')

    // ต้องไม่เรียก Gemini API และแสดงแจ้งเตือนเรื่องอินเทอร์เน็ต
    expect(extractTextFromImage).not.toHaveBeenCalled()
    const alert = wrapper.findComponent(AlertDialog)
    expect(alert.props('visible')).toBe(true)
    expect(alert.props('message')).toBe('Internet connection required for AI features.')
  })

  it('STC-03 Step 3 & 4 และ STC-07-02 & 07-03: อัปโหลดรูปสำเร็จ ส่งข้อความออก และซ่อนข้อความแจ้งเตือนหลังครบ 3 วินาที', async () => {
    vi.mocked(extractTextFromImage).mockResolvedValue('Extracted text from slide 1')
    const wrapper = mount(OcrUploadPanel)

    const pngFile = new File(['image-bytes'], 'test_image.png', { type: 'image/png' })
    const fileInput = wrapper.find('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [pngFile],
      configurable: true,
    })
    await fileInput.trigger('change')

    // รอให้แปลงไฟล์และรับค่าจาก Mock API เสร็จ
    await vi.waitFor(() => {
      expect(wrapper.emitted('text-extracted')).toBeTruthy()
    })

    // ตรวจสอบข้อความที่ส่งออกไปให้ Editor (STC-07-03)
    expect(wrapper.emitted('text-extracted')![0]).toEqual(['Extracted text from slide 1'])

    // ตรวจสอบหน้าจอแสดงสถานะสำเร็จและชื่อไฟล์ (STC-03 Step 3)
    expect(wrapper.find('.ocr__msg--success').exists()).toBe(true)
    expect(wrapper.find('.ocr__filename').text()).toBe('test_image.png')

    // รอครบ 3 วินาที ข้อความสำเร็จต้องหายไปอัตโนมัติ (STC-03 Step 4)
    vi.advanceTimersByTime(3000)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ocr__msg--success').exists()).toBe(false)
  })

  it('STC-07-04: กรณี Gemini API ล้มเหลว ต้องแสดงข้อความ Error และไม่ส่งข้อความว่างเข้า Editor', async () => {
    vi.mocked(extractTextFromImage).mockRejectedValue(new Error('API rate limit exceeded'))
    const wrapper = mount(OcrUploadPanel)

    const jpgFile = new File(['image-bytes'], 'blank.jpg', { type: 'image/jpeg' })
    const fileInput = wrapper.find('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [jpgFile],
      configurable: true,
    })
    await fileInput.trigger('change')

    await vi.waitFor(() => {
      const alert = wrapper.findComponent(AlertDialog)
      expect(alert.props('visible')).toBe(true)
    })

    // ต้องไม่ส่งข้อมูลใดๆ ไปแทรกใน Editor
    expect(wrapper.emitted('text-extracted')).toBeUndefined()
    expect(wrapper.findComponent(AlertDialog).props('message')).toBe(
      'Text extraction failed. Please try again.'
    )
  })
})