// src/services/quizDistribution.test.ts
// Feature 7 — SRS-7.1.5
//
// เทสเฉพาะ logic ฝั่งเรา (คำนวณเป้าหมาย / นับผล / เทียบ tolerance)
// ไม่เทสว่า Gemini ทำตามสัดส่วนที่สั่งจริงหรือไม่ — นั่นไม่ deterministic

import { describe, it, expect } from 'vitest'
import {
  computeStyleDistribution,
  toleranceFor,
  countByDifficulty,
  withinTolerance,
  type QuizCount,
} from './quizDistribution'

describe('computeStyleDistribution — Mixed style (SRS-7.1.5)', () => {
  it('splits 40/40/20 for N=10', () => {
    expect(computeStyleDistribution(10, 'mixed')).toEqual({
      recall: 4, understanding: 4, application: 2,
    })
  })

  it('scales down for N=5', () => {
    expect(computeStyleDistribution(5, 'mixed')).toEqual({
      recall: 2, understanding: 2, application: 1,
    })
  })

  it('scales up for N=20', () => {
    expect(computeStyleDistribution(20, 'mixed')).toEqual({
      recall: 8, understanding: 8, application: 4,
    })
  })

  it('always sums to N regardless of rounding', () => {
    for (const n of [5, 10, 20] as QuizCount[]) {
      const d = computeStyleDistribution(n, 'mixed')
      expect(d.recall + d.understanding + d.application).toBe(n)
    }
  })
})

describe('computeStyleDistribution — single style', () => {
  it('puts 100% of questions in the selected category', () => {
    expect(computeStyleDistribution(10, 'recall')).toEqual({
      recall: 10, understanding: 0, application: 0,
    })
    expect(computeStyleDistribution(10, 'understanding')).toEqual({
      recall: 0, understanding: 10, application: 0,
    })
    expect(computeStyleDistribution(10, 'application')).toEqual({
      recall: 0, understanding: 0, application: 10,
    })
  })
})

describe('toleranceFor', () => {
  it('is ±1 at N=10 per SRS-7.1.5', () => {
    expect(toleranceFor(10)).toBe(1)
  })

  it('never goes below 1 for N=5', () => {
    expect(toleranceFor(5)).toBe(1)
  })

  it('scales up for N=20', () => {
    expect(toleranceFor(20)).toBe(2)
  })
})

describe('countByDifficulty', () => {
  it('tallies questions by difficulty', () => {
    const questions = [
      { difficulty: 'recall' as const },
      { difficulty: 'recall' as const },
      { difficulty: 'understanding' as const },
      { difficulty: 'application' as const },
    ]
    expect(countByDifficulty(questions)).toEqual({
      recall: 2, understanding: 1, application: 1,
    })
  })

  it('returns all zeros for an empty list', () => {
    expect(countByDifficulty([])).toEqual({
      recall: 0, understanding: 0, application: 0,
    })
  })
})

describe('withinTolerance', () => {
  const target = { recall: 4, understanding: 4, application: 2 }

  it('accepts an exact match', () => {
    expect(withinTolerance(target, target)).toBe(true)
  })

  it('accepts a deviation within the default ±1 tolerance', () => {
    const actual = { recall: 5, understanding: 3, application: 2 }
    expect(withinTolerance(actual, target)).toBe(true)
  })

  it('rejects a deviation beyond tolerance', () => {
    const actual = { recall: 6, understanding: 2, application: 2 }
    expect(withinTolerance(actual, target, 1)).toBe(false)
  })

  it('respects a custom tolerance (e.g. N=20 -> ±2)', () => {
    const actual = { recall: 6, understanding: 2, application: 2 }
    expect(withinTolerance(actual, target, 2)).toBe(true)
  })
})