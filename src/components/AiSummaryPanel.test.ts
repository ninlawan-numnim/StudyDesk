// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AiSummaryPanel from './AiSummaryPanel.vue'
import AlertDialog from './AlertDialog.vue'
import { summarizeContent, SummaryError } from '../services/gemini'

// จำลอง (Mock) ฟังก์ชัน summarizeContent ของ Gemini
vi.mock('../services/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/gemini')>()
  return {
    ...actual,
    summarizeContent: vi.fn(),
  }
})

describe('STC-08, UTC-06-04 & STC-10: AI Summarization (AiSummaryPanel)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('STC-08 Step 1: เมื่อไม่มีทั้ง PDF และ Notes ปุ่ม Generate Summary ต้องถูกล็อก (Disabled) และไม่ยิง API', () => {
    const wrapper = mount(AiSummaryPanel, {
      props: {
        pdfAvailable: false,
        notesContent: '   ',
        getPdfText: vi.fn().mockResolvedValue(''),
      },
    })

    // ค่าเริ่มต้นต้องเลือกแหล่งข้อมูลเป็น Both
    const sourceBtns = wrapper.findAll('.asp__source-btn')
    expect(sourceBtns[2].text()).toBe('Both')
    expect(sourceBtns[2].classes()).toContain('asp__source-btn--active')

    // ปุ่ม Generate ต้องถูก disabled เพราะไม่มีเนื้อหาเลย
    const generateBtn = wrapper.find('.asp__generate-btn')
    expect(generateBtn.attributes('disabled')).toBeDefined()
    expect(summarizeContent).not.toHaveBeenCalled()
  })

  it('STC-08 Step 2: เลือก Both ต้องดึงข้อความจากทั้ง PDF และ Notes พร้อมตัดแท็ก base64 <img> ออกก่อนส่ง API', async () => {
    vi.mocked(summarizeContent).mockResolvedValue('Bullet 1\nBullet 2')
    const mockGetPdfText = vi.fn().mockResolvedValue('Chapter 1: Software Testing')

    const notesWithBase64Img =
      'My lecture note <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==" width="400" /> end of note'

    const wrapper = mount(AiSummaryPanel, {
      props: {
        pdfAvailable: true,
        notesContent: notesWithBase64Img,
        getPdfText: mockGetPdfText,
      },
    })

    await wrapper.find('.asp__generate-btn').trigger('click')

    await vi.waitFor(() => {
      expect(summarizeContent).toHaveBeenCalledTimes(1)
    })

    // ตรวจสอบว่าดึงข้อความจาก PDF และแทนที่รูป Base64 ด้วย [Embedded Image]
    expect(mockGetPdfText).toHaveBeenCalled()
    expect(summarizeContent).toHaveBeenCalledWith(
      'both',
      'Chapter 1: Software Testing\n\n---\n\nMy lecture note [Embedded Image] end of note'
    )
  })

  it('STC-08 Step 3 & 4 และ UTC-06-04: สรุปผลสำเร็จต้องส่ง Markdown ออกไปแสดงผล และซ่อนป้ายแจ้งเตือนหลัง 3 วินาที', async () => {
    vi.mocked(summarizeContent).mockResolvedValue('Key point summary')

    const wrapper = mount(AiSummaryPanel, {
      props: {
        pdfAvailable: false,
        notesContent: 'Some study notes here',
        getPdfText: vi.fn().mockResolvedValue(''),
      },
    })

    // สลับไปเลือกเฉพาะ Notes แล้วกด Generate
    const notesBtn = wrapper.findAll('.asp__source-btn')[1]
    await notesBtn.trigger('click')
    await wrapper.find('.asp__generate-btn').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.emitted('summary-generated')).toBeTruthy()
    })

    // ตรวจสอบข้อความที่ส่งออกไปแทรกใน Editor (UTC-06-04)
    expect(wrapper.emitted('summary-generated')![0]).toEqual(['\n## Summary\n\nKey point summary\n'])

    // แสดงป้าย ✓ Summary Inserted และหายไปเองหลังครบ 3 วินาที (STC-08 Step 4)
    expect(wrapper.find('.asp__msg--success').exists()).toBe(true)
    vi.advanceTimersByTime(3000)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.asp__msg--success').exists()).toBe(false)
  })

  it('STC-08 Step 5 & STC-10.3: กรณีเนื้อหายาวเกินกำหนด (>100,000 ตัวอักษร) ต้องแสดง AlertDialog แจ้งเตือนโดยไม่พัง', async () => {
    vi.mocked(summarizeContent).mockRejectedValue(
      new SummaryError('The selected content is too long to summarize in a single request.', 'TOO_LONG' as any)
    )

    const wrapper = mount(AiSummaryPanel, {
      props: {
        pdfAvailable: false,
        notesContent: 'A'.repeat(100005),
        getPdfText: vi.fn().mockResolvedValue(''),
      },
    })

    await wrapper.find('.asp__generate-btn').trigger('click')

    await vi.waitFor(() => {
      const alert = wrapper.findComponent(AlertDialog)
      expect(alert.props('visible')).toBe(true)
    })

    expect(wrapper.emitted('summary-generated')).toBeUndefined()
    expect(wrapper.findComponent(AlertDialog).props('message')).toContain(
      'The selected content is too long to summarize in a single request'
    )
  })

  it('STC-10.1: กรณีเน็ตหลุดหรือ API Error ต้องแสดงข้อความแจ้งเตือน Summary generation failed', async () => {
    vi.mocked(summarizeContent).mockRejectedValue(new Error('Network error'))

    const wrapper = mount(AiSummaryPanel, {
      props: {
        pdfAvailable: false,
        notesContent: 'Valid notes content',
        getPdfText: vi.fn().mockResolvedValue(''),
      },
    })

    await wrapper.find('.asp__generate-btn').trigger('click')

    await vi.waitFor(() => {
      const alert = wrapper.findComponent(AlertDialog)
      expect(alert.props('visible')).toBe(true)
    })

    expect(wrapper.findComponent(AlertDialog).props('message')).toBe(
      'Summary generation failed. Please try again.'
    )
  })
})