import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: 'electron/main.ts',
        
        // ── 🛠️ FIX: เพิ่มบล็อกนี้เพื่อทำ Externalization ──
        vite: {
          build: {
            rollupOptions: {
              external: ['better-sqlite3'] // ห้าม Vite ไปยุ่งกับไลบรารีตัวนี้
            }
          }
        }
        // ──────────────────────────────────────────
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: process.env.NODE_ENV === 'test'
        ? undefined
        : {},
    }),
  ],
})