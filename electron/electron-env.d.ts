/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: {
    on:      (...args: any[]) => any
    off:     (...args: any[]) => any
    send:    (...args: any[]) => any
    invoke:  (...args: any[]) => any

    // Feature 1 — เพิ่ม filePath ใน return type
    openPdfFile: () => Promise<{
      buffer:   number[]
      fileName: string
      filePath: string    // ← เพิ่มบรรทัดนี้
    } | null>

    // Feature 2 — Session Recovery
    saveSession: (data: {
      session_id:       number
      pdf_file_path:    string
      current_page:     number
      cursor_index:     number
      markdown_content: string
    }) => Promise<{ success: boolean }>

    loadSession: () => Promise<{
      session_id:       number
      pdf_file_path:    string
      current_page:     number
      cursor_index:     number
      last_updated:     string
      markdown_content: string
    } | null>

    invoke: (...args: any[]) => any,
    getByPath: (path: string) => Promise<any>
    createSession: (path: string) => Promise<any>
  }
}
