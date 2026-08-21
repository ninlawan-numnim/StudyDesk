import { GoogleGenerativeAI } from "@google/generative-ai";
import { computeStyleDistribution, countByDifficulty, withinTolerance, toleranceFor } from "./quizDistribution.ts";


const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// แยกชนิด error เพื่อให้ UI แสดงข้อความที่ "specific" ตาม SRS-3.2.5
export class OcrError extends Error {
  constructor(message: string, public code: 'NO_TEXT' | 'API_ERROR') {
    super(message);
    this.name = 'OcrError';
  }
}

/**
 * Feature 3 (Part 2) — SRS-3.2.1 ~ 3.2.5
 * ส่งภาพไป Gemini Vision เพื่อดึงข้อความ, คงโครงสร้างบรรทัดเดิม
 */
export async function extractTextFromImage(
  dataUrl: string,
  mimeType: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const base64Data = dataUrl.split(',')[1] ?? dataUrl; // ตัด prefix "data:image/png;base64,"

  const prompt = `Extract all readable text from this image exactly as it appears.
Preserve the original line breaks and structure as closely as possible.
Do not add any explanation, comment, or markdown formatting — return ONLY the raw extracted text.
If there is no readable text in the image, respond with exactly: NO_TEXT_FOUND`;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType } },
    ]);

    const text = result.response.text().trim();

    if (!text || text === 'NO_TEXT_FOUND') {
      throw new OcrError('No readable text was found in this image.', 'NO_TEXT');
    }
    return text;
  } catch (err) {
    if (err instanceof OcrError) throw err;
    console.error('[OCR] Gemini API error:', err);
    throw new OcrError('Text extraction failed. Please try again later.', 'API_ERROR');
  }
}

// ─────────────────────────────────────────────────────────────────────
// Feature 5 — AI Summarization (SRS-5.1.x)
// ─────────────────────────────────────────────────────────────────────
export type SummarySource = 'pdf' | 'notes' | 'both';

// แยกชนิด error เพื่อให้ UI แสดงข้อความที่ "specific" ตาม SRS-5.1.6
export class SummaryError extends Error {
  constructor(message: string, public code: 'EMPTY_SOURCE' | 'CONTEXT_LIMIT' | 'API_ERROR') {
    super(message);
    this.name = 'SummaryError';
  }
}

// เผื่อไว้ก่อนยิง API — กันเคส "combined source content exceeds the
// model's context limit" (SRS-5.1.6) โดยไม่ต้องรอ API ตอบ error กลับมา
// ~4 chars/token คร่าวๆ, เผื่อ margin ให้ prompt wrapper text ด้วย
const MAX_SUMMARY_INPUT_CHARS = 100_000;

function sourceLabel(source: SummarySource): string {
  if (source === 'pdf')   return 'PDF content';
  if (source === 'notes') return 'personal notes';
  return 'study material (PDF content and personal notes)';
}

/**
 * Feature 5 — SRS-5.1.4 ~ 5.1.6
 * ส่ง text ที่ประกอบมาแล้ว (จาก PdfViewer.getFullText() / markdown notes)
 * ไป Gemini พร้อม summarization prompt, insert เป็น markdown กลับมา
 */
export async function summarizeContent(
  source: SummarySource,
  text: string
): Promise<string> {
  const trimmed = text.trim();

  // SRS-5.1.3 — ว่าง -> error, ไม่เรียก API (เผื่อไว้อีกชั้น นอกจาก UI check)
  if (!trimmed) {
    throw new SummaryError('No content available to summarize.', 'EMPTY_SOURCE');
  }

  // SRS-5.1.6 — เกิน context limit -> error เฉพาะเจาะจง, ไม่เรียก API
  if (trimmed.length > MAX_SUMMARY_INPUT_CHARS) {
    throw new SummaryError(
      'The selected content is too long to summarize in a single request. Try summarizing PDF or Notes separately.',
      'CONTEXT_LIMIT'
    );
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const prompt = `You are summarizing ${sourceLabel(source)} for a student using a study app.
Write a concise, well-structured summary in Markdown (use short paragraphs and/or bullet points).
Focus on key concepts, not minor details.
Do NOT include a top-level heading (e.g. "# ..." or "## Summary") — the caller adds that separately.
Respond with ONLY the summary content, no preamble or closing remarks.

SOURCE MATERIAL:
${trimmed}`;

  try {
    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    if (!summary) {
      throw new SummaryError('The AI did not return a summary. Please try again.', 'API_ERROR');
    }
    return summary;
  } catch (err) {
    if (err instanceof SummaryError) throw err;

    // Gemini มักส่ง error message ที่มีคำว่า "context"/"token" กลับมา
    // เมื่อ prompt ยาวเกิน limit ของโมเดล — จับแยกให้ตรง SRS-5.1.6
    const message = err instanceof Error ? err.message.toLowerCase() : '';
    if (message.includes('context') || message.includes('token')) {
      throw new SummaryError(
        'The selected content is too long for the AI to process. Try a smaller source.',
        'CONTEXT_LIMIT'
      );
    }

    console.error('[Summary] Gemini API error:', err);
    throw new SummaryError('Summary generation failed. Please try again later.', 'API_ERROR');
  }
}

// ─────────────────────────────────────────────────────────────────────
// Feature 7 — AI Quiz Generator (SRS-7.1.x)
// ─────────────────────────────────────────────────────────────────────
export type QuizSource = 'pdf' | 'notes' | 'both';
export type QuizCount  = 5 | 10 | 20;
export type QuizStyle  = 'recall' | 'understanding' | 'application' | 'mixed';
export type QuizDifficulty = 'recall' | 'understanding' | 'application';

export interface QuizQuestion {
  question:    string;
  choices:     string[];
  answer:      number;
  explanation: string;
  difficulty:  QuizDifficulty;
}

export class QuizError extends Error {
  constructor(
    message: string,
    public code: 'EMPTY_SOURCE' | 'CONTEXT_LIMIT' | 'MALFORMED' | 'API_ERROR'
  ) {
    super(message);
    this.name = 'QuizError';
  }
}

const MAX_QUIZ_INPUT_CHARS = 100_000;

function sourceLabelQuiz(source: QuizSource): string {
  if (source === 'pdf')   return 'PDF content';
  if (source === 'notes') return 'personal notes';
  return 'study material (PDF content and personal notes)';
}

function styleInstruction(count: QuizCount, style: QuizStyle): string {
  if (style !== 'mixed') {
    return `All ${count} questions must be difficulty "${style}".`;
  }
  const target = computeStyleDistribution(count, style);
  return `Use a mix of difficulties: ${target.recall} "recall", ` +
    `${target.understanding} "understanding", and ${target.application} "application" questions.`;
}

function isValidQuizQuestion(q: unknown): q is QuizQuestion {
  if (typeof q !== 'object' || q === null) return false;
  const r = q as Record<string, unknown>;
  return (
    typeof r.question === 'string' &&
    Array.isArray(r.choices) && r.choices.length >= 2 &&
    r.choices.every((c) => typeof c === 'string') &&
    typeof r.answer === 'number' && r.answer >= 0 && r.answer < r.choices.length &&
    typeof r.explanation === 'string' &&
    (r.difficulty === 'recall' || r.difficulty === 'understanding' || r.difficulty === 'application')
  );
}

export async function generateQuiz(
  source: QuizSource,
  count: QuizCount,
  style: QuizStyle,
  text: string
): Promise<QuizQuestion[]> {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new QuizError('No content available to generate a quiz from.', 'EMPTY_SOURCE');
  }
  if (trimmed.length > MAX_QUIZ_INPUT_CHARS) {
    throw new QuizError(
      'The selected content is too long to generate a quiz from in a single request. Try PDF or Notes separately.',
      'CONTEXT_LIMIT'
    );
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt = `Generate exactly ${count} multiple-choice quiz questions from the ${sourceLabelQuiz(source)} below, for a student studying this material.

${styleInstruction(count, style)}

Each question needs 4 plausible answer choices — wrong choices (distractors) must be believable, not obviously wrong or silly (SRS-7.1.6).

Respond with ONLY a JSON array (no markdown, no preamble), where each item has exactly this shape:
{
  "question": string,
  "choices": string[4],
  "answer": number,
  "explanation": string,
  "difficulty": "recall" | "understanding" | "application"
}

SOURCE MATERIAL:
${trimmed}`;

  let raw: string;
  try {
    const result = await model.generateContent(prompt);
    raw = result.response.text().trim();
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : '';
    if (message.includes('context') || message.includes('token')) {
      throw new QuizError(
        'The selected content is too long for the AI to process. Try a smaller source.',
        'CONTEXT_LIMIT'
      );
    }
    console.error('[Quiz] Gemini API error:', err);
    throw new QuizError('Quiz generation failed. Please try again later.', 'API_ERROR');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('[Quiz] Gemini returned invalid JSON:', raw);
    throw new QuizError('The AI returned an invalid quiz format. Please try again.', 'MALFORMED');
  }

  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isValidQuizQuestion)) {
    console.error('[Quiz] Gemini JSON failed schema validation:', parsed);
    throw new QuizError('The AI returned an invalid quiz format. Please try again.', 'MALFORMED');
  }

  const questions = parsed as QuizQuestion[];

  const target = computeStyleDistribution(count, style);
  const actual = countByDifficulty(questions);
  if (!withinTolerance(actual, target, toleranceFor(count))) {
    console.warn('[Quiz] Style distribution outside tolerance', { target, actual, count, style });
  }

  return questions;
}