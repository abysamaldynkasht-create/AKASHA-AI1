import { GoogleGenAI } from "@google/genai";

// Use process.env.GEMINI_API_KEY as the primary source, fallback to import.meta.env for local dev if needed
const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenAI({ apiKey });

export const getGeminiResponse = async (prompt: string, history: { role: string, parts: { text: string }[] }[] = []) => {
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing. Please set it in the Secrets panel.");
    throw new Error("عذراً، مفتاح الـ API الخاص بـ Gemini غير متوفر. يرجى إعداده في الإعدادات.");
  }

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...history, { role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are Akasha AI 0.1, a highly intelligent and helpful assistant. You provide clear, accurate, and concise answers. You support both Arabic and English. Your design is modern and your personality is professional yet friendly.",
      }
    });

    if (!response || !response.text) {
      throw new Error("لم يتم استلام رد من النموذج.");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("API key not valid")) {
      throw new Error("مفتاح الـ API غير صالح. يرجى التحقق من صحته.");
    }
    throw new Error("حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى.");
  }
};
