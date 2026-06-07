// electron/database.ts
// Main Process — Node.js environment
// จัดการ SQLite ผ่าน better-sqlite3
// ห้าม import Vue หรือ browser API ใดๆ

import Database from 'better-sqlite3'
import path from 'node:path'
import { app } from 'electron'

// ── Types ────────────────────────────────────────────
export interface SessionData {
  pdf_file_path:  string
  current_page:   number
  cursor_index:   number
  last_updated:   string // ISO datetime string
}

// ── DB instance (singleton) ───────────────────────────
let db: Database.Database | null = null

function getDb(): Database.Database {
  if (db) return db

  // เก็บ DB ใน userData ของ app — ถาวรข้ามการเปิดปิด
  // path เช่น: C:\Users\xxx\AppData\Roaming\StudyDesk\studydesk.db
  const dbPath = path.join(app.getPath('userData'), 'studydesk.db')

  db = new Database(dbPath)

  // WAL mode — เขียนเร็วขึ้น ปลอดภัยกว่าถ้า crash
  db.pragma('journal_mode = WAL')

  initSchema(db)
  return db
}

// ── Schema initialization ─────────────────────────────
function initSchema(database: Database.Database): void {
  // STUDY_SESSIONS — SRS-2.1.1
  database.exec(`
    CREATE TABLE IF NOT EXISTS STUDY_SESSIONS (
      session_id    INTEGER PRIMARY KEY AUTOINCREMENT,
      pdf_file_path TEXT    NOT NULL DEFAULT '',
      current_page  INTEGER NOT NULL DEFAULT 1,
      cursor_index  INTEGER NOT NULL DEFAULT 0,
      last_updated  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS MARKDOWN_NOTES (
      note_id       INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id    INTEGER NOT NULL,
      content       TEXT    NOT NULL DEFAULT '',
      last_modified TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES STUDY_SESSIONS(session_id)
    );
  `)

  // ถ้ายังไม่มี session เลย ให้สร้าง default session ก่อน
  const count = database.prepare(
    'SELECT COUNT(*) as cnt FROM STUDY_SESSIONS'
  ).get() as { cnt: number }

  if (count.cnt === 0) {
    const insert = database.prepare(`
      INSERT INTO STUDY_SESSIONS (pdf_file_path, current_page, cursor_index, last_updated)
      VALUES ('', 1, 0, datetime('now'))
    `)
    const result = insert.run()

    // สร้าง MARKDOWN_NOTES ควบคู่กัน (1:1 relationship)
    database.prepare(`
      INSERT INTO MARKDOWN_NOTES (session_id, content, last_modified)
      VALUES (?, '', datetime('now'))
    `).run(result.lastInsertRowid)
  }
}

// ── Public API ────────────────────────────────────────

/**
 * saveSession — SRS-2.1.1
 * บันทึก session state และ markdown content ลง DB
 */
export function saveSession(
  data: SessionData & { markdown_content: string; session_id: number }
): void {
  const database = getDb()

  // อัปเดตตาราง STUDY_SESSIONS ตรงตาม ID
  database.prepare(`
    UPDATE STUDY_SESSIONS
    SET pdf_file_path = ?,
        current_page  = ?,
        cursor_index  = ?,
        last_updated  = datetime('now')
    WHERE session_id = ?
  `).run(data.pdf_file_path, data.current_page, data.cursor_index, data.session_id)

  // อัปเดตตาราง MARKDOWN_NOTES ตรงตาม ID
  database.prepare(`
    UPDATE MARKDOWN_NOTES
    SET content       = ?,
        last_modified = datetime('now')
    WHERE session_id = ?
  `).run(data.markdown_content, data.session_id)
}

/**
 * loadSession — SRS-2.2.1
 * โหลด session state และ markdown content จาก DB
 */
export function loadSession(): (SessionData & { markdown_content: string; session_id: number }) | null {
  const database = getDb()

  const session = database.prepare(`
    SELECT s.session_id,
           s.pdf_file_path,
           s.current_page,
           s.cursor_index,
           s.last_updated,
           n.content as markdown_content
    FROM STUDY_SESSIONS s
    LEFT JOIN MARKDOWN_NOTES n ON n.session_id = s.session_id
    ORDER BY s.last_updated DESC
    LIMIT 1
  `).get() as any // ใช้ as any ชั่วคราวไปก่อนได้ครับ

  if (!session) return null

  return {
    session_id:       session.session_id, // 🛠️ เพิ่มบรรทัดนี้ เพื่อส่ง ID กลับไปให้ Vue!
    pdf_file_path:    session.pdf_file_path,
    current_page:     session.current_page,
    cursor_index:     session.cursor_index,
    last_updated:     session.last_updated,
    markdown_content: session.markdown_content ?? '',
  }
}

export function getSessionByPdfPath(pdfPath: string): (SessionData & { markdown_content: string }) | null {
  const database = getDb()
  const session = database.prepare(`
    SELECT s.session_id, s.pdf_file_path, s.current_page, s.cursor_index, n.content as markdown_content
    FROM STUDY_SESSIONS s
    LEFT JOIN MARKDOWN_NOTES n ON n.session_id = s.session_id
    WHERE s.pdf_file_path = ?
  `).get(pdfPath) as any
  
  return session || null
}


export function createSession(pdfPath: string): number {
  const database = getDb()
  const insertSession = database.prepare(`
    INSERT INTO STUDY_SESSIONS (pdf_file_path, current_page, cursor_index)
    VALUES (?, 1, 0)
  `)
  const sessionResult = insertSession.run(pdfPath)
  const sessionId = sessionResult.lastInsertRowid as number

  database.prepare(`
    INSERT INTO MARKDOWN_NOTES (session_id, content)
    VALUES (?, '')
  `).run(sessionId)

  return sessionId
}

/**
 * closeDb — เรียกตอน app ปิด เพื่อ flush WAL buffer
 */
export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}