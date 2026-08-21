// src/services/quizDistribution.ts
// Feature 7 — SRS-7.1.5: Mixed style question distribution
//
// แยกออกมาจาก services/gemini.ts โดยตั้งใจ — ฟังก์ชันในไฟล์นี้ทั้งหมด
// เป็น pure function (ไม่เรียก network, ไม่มี side effect) จึง unit
// test ได้โดยตรง ไม่ต้อง mock Gemini API เลย

export type QuizDifficulty = 'recall' | 'understanding' | 'application'
export type QuizStyle = QuizDifficulty | 'mixed'
export type QuizCount = 5 | 10 | 20

export interface StyleDistribution {
  recall: number
  understanding: number
  application: number
}

// SRS-7.1.5 — Mixed = 40% Recall / 40% Understanding / 20% Application
const MIXED_RATIO: StyleDistribution = {
  recall: 0.4,
  understanding: 0.4,
  application: 0.2,
}

/**
 * คำนวณ "เป้าหมาย" จำนวนข้อต่อ difficulty ตาม style ที่เลือก
 * - style เดี่ยว (recall/understanding/application) → ทุกข้อเป็น difficulty นั้น
 * - 'mixed' → แบ่งตาม MIXED_RATIO ด้วย largest-remainder method
 *   (กันปัดเศษแล้วผลรวมไม่เท่ากับ count พอดี)
 */
export function computeStyleDistribution(count: QuizCount, style: QuizStyle): StyleDistribution {
  if (style !== 'mixed') {
    return {
      recall:        style === 'recall'        ? count : 0,
      understanding: style === 'understanding' ? count : 0,
      application:   style === 'application'   ? count : 0,
    }
  }

  const raw = {
    recall:        count * MIXED_RATIO.recall,
    understanding: count * MIXED_RATIO.understanding,
    application:   count * MIXED_RATIO.application,
  }
  const floored: StyleDistribution = {
    recall:        Math.floor(raw.recall),
    understanding: Math.floor(raw.understanding),
    application:   Math.floor(raw.application),
  }

  const remainder = count - (floored.recall + floored.understanding + floored.application)

  // แจก remainder ให้ category ที่มีเศษทศนิยมมากสุดก่อน
  const order = (Object.keys(raw) as QuizDifficulty[])
    .sort((a, b) => (raw[b] - floored[b]) - (raw[a] - floored[a]))

  const result: StyleDistribution = { ...floored }
  for (let i = 0; i < remainder; i++) {
    result[order[i % order.length]] += 1
  }
  return result
}

/**
 * SRS-7.1.5 — เกณฑ์ยอมรับ ±1 ข้อ/category ที่ N=10, "scaled
 * proportionally" สำหรับ N=5/N=20 — ไม่ต่ำกว่า 1 เสมอ
 */
export function toleranceFor(count: QuizCount): number {
  return Math.max(1, Math.round(count / 10))
}

/** นับจำนวนข้อจริงต่อ difficulty จาก quiz ที่ Gemini ส่งกลับมา */
export function countByDifficulty(
  questions: { difficulty: QuizDifficulty }[]
): StyleDistribution {
  const counts: StyleDistribution = { recall: 0, understanding: 0, application: 0 }
  for (const q of questions) {
    counts[q.difficulty] += 1
  }
  return counts
}

/**
 * เช็คว่าผลลัพธ์จริงห่างจากเป้าหมายเกิน tolerance (default ±1) ไหม
 * ต่อ category — ใช้ log warning เฉยๆ ไม่ reject quiz (SRS-7.1.5
 * เป็นการ instruct model ไม่ใช่ enforce เข้มงวด)
 */
export function withinTolerance(
  actual: StyleDistribution,
  target: StyleDistribution,
  tolerance = 1
): boolean {
  return (
    Math.abs(actual.recall - target.recall) <= tolerance &&
    Math.abs(actual.understanding - target.understanding) <= tolerance &&
    Math.abs(actual.application - target.application) <= tolerance
  )
}