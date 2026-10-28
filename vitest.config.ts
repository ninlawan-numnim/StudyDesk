import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// คงความตั้งใจเดิมของเพื่อน: ค่าตั้งต้นเป็น node สำหรับ pure logic
// แต่เปิดปลั๊กอิน vue และใช้ happy-dom เฉพาะในโฟลเดอร์ components
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/components/**', 'happy-dom'],
    ],
    include: ['src/**/*.test.ts'],
  },
})