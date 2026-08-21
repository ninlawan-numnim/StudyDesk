import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateContent = vi.fn()

vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent }
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI }
})

import { generateQuiz, QuizError } from './gemini'

function mockResponseText(text: string) {
  mockGenerateContent.mockResolvedValue({ response: { text: () => text } })
}

const VALID_QUESTION = {
  question: 'What does SQLite store StudyDesk quizzes as?',
  choices: ['Rows', 'JSON files', 'XML', 'CSV'],
  answer: 0,
  explanation: 'Quizzes are persisted as rows across two tables.',
  difficulty: 'recall',
}

beforeEach(() => {
  mockGenerateContent.mockReset()
})

describe('generateQuiz — input guards', () => {
  it('rejects empty source text before calling the API', async () => {
    await expect(generateQuiz('notes', 10, 'mixed', '   ')).rejects.toThrow(QuizError)
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })

  it('rejects source text over the length guard before calling the API', async () => {
    const huge = 'a'.repeat(100_001)
    await expect(generateQuiz('notes', 10, 'mixed', huge)).rejects.toThrow(QuizError)
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })
})

describe('generateQuiz — valid response', () => {
  it('parses a well-formed JSON array into QuizQuestion[]', async () => {
    mockResponseText(JSON.stringify([VALID_QUESTION]))
    const result = await generateQuiz('notes', 5, 'recall', 'some notes content')
    expect(result).toEqual([VALID_QUESTION])
  })
})

describe('generateQuiz — malformed response (SRS-7.1.9)', () => {
  it('throws MALFORMED on invalid JSON', async () => {
    mockResponseText('this is not json')
    await expect(generateQuiz('notes', 5, 'recall', 'x')).rejects.toMatchObject({ code: 'MALFORMED' })
  })

  it('throws MALFORMED when the response is not an array', async () => {
    mockResponseText(JSON.stringify({ not: 'an array' }))
    await expect(generateQuiz('notes', 5, 'recall', 'x')).rejects.toMatchObject({ code: 'MALFORMED' })
  })

  it('throws MALFORMED when a question is missing required fields', async () => {
    const { explanation, ...missingExplanation } = VALID_QUESTION
    mockResponseText(JSON.stringify([missingExplanation]))
    await expect(generateQuiz('notes', 5, 'recall', 'x')).rejects.toMatchObject({ code: 'MALFORMED' })
  })

  it('throws MALFORMED when answer index is out of range', async () => {
    mockResponseText(JSON.stringify([{ ...VALID_QUESTION, answer: 99 }]))
    await expect(generateQuiz('notes', 5, 'recall', 'x')).rejects.toMatchObject({ code: 'MALFORMED' })
  })

  it('throws MALFORMED on an empty array', async () => {
    mockResponseText(JSON.stringify([]))
    await expect(generateQuiz('notes', 5, 'recall', 'x')).rejects.toMatchObject({ code: 'MALFORMED' })
  })
})

describe('generateQuiz — API failure', () => {
  it('throws API_ERROR when the SDK call rejects', async () => {
    mockGenerateContent.mockRejectedValue(new Error('network down'))
    await expect(generateQuiz('notes', 5, 'recall', 'x')).rejects.toMatchObject({ code: 'API_ERROR' })
  })

  it('throws CONTEXT_LIMIT when the SDK error mentions context/token', async () => {
    mockGenerateContent.mockRejectedValue(new Error('exceeds context window'))
    await expect(generateQuiz('notes', 5, 'recall', 'x')).rejects.toMatchObject({ code: 'CONTEXT_LIMIT' })
  })
})