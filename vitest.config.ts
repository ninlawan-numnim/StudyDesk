import { defineConfig } from 'vitest/config'
 
// แยกไฟล์ config ออกจาก vite.config.ts ตั้งใจ — vite.config.ts ผูกกับ
// vite-plugin-electron (main/preload build) ซึ่งไม่เกี่ยวกับ unit test เลย
// และมี branch `process.env.NODE_ENV === 'test'` อยู่แล้วที่จะยุ่งยากถ้า merge
// config เข้าด้วยกัน จึงแยกให้ `vitest` อ่านไฟล์นี้แทน
export default defineConfig({
  test: {
    environment: 'node', // pure logic functions เท่านั้น ไม่ต้องใช้ jsdom
    include: ['src/**/*.test.ts'],
  },
})
 