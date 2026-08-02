import { GoogleGenerativeAI } from "@google/generative-ai";

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