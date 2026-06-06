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
    on:         (...args: any[]) => any
    off:        (...args: any[]) => any
    send:       (...args: any[]) => any
    invoke:     (...args: any[]) => any
    openPdfFile: () => Promise<{ buffer: number[]; fileName: string } | null>

    // Feature 2 — Session Recovery
    saveSession: (data: {
      pdf_file_path:    string
      current_page:     number
      cursor_index:     number
      markdown_content: string
    }) => Promise<{ success: boolean }>

    loadSession: () => Promise<{
      pdf_file_path:    string
      current_page:     number
      cursor_index:     number
      last_updated:     string
      markdown_content: string
    } | null>
  }
}
