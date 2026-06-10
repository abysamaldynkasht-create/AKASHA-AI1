import { GoogleGenAI } from "@google/genai";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

// Default API Key from environment
const defaultApiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";

export const getGeminiResponse = async (
  prompt: string, 
  history: { role: string, parts: { text: string }[] }[] = [], 
  userMemory: string = "",
  userId: string = ""
) => {
  // 1. Fetch User Custom AI Settings from Firestore if userId is present
  let customSystemInstruction = '';

  if (userId) {
    try {
      const aiSnap = await getDoc(doc(db, 'users', userId, 'config', 'ai'));
      if (aiSnap.exists()) {
        const aiData = aiSnap.data();
        customSystemInstruction = aiData.systemInstruction || '';
      }
    } catch (error) {
      console.warn("Could not load user AI settings, falling back to default Gemini:", error);
    }
  }

  // 2. Prepare system instructions
  const baseInstruction = customSystemInstruction || `You are Akasha AI 0.1, a highly intelligent and helpful assistant. You provide clear, accurate, and concise answers. You support both Arabic and English. Your design is modern and your personality is professional yet friendly.`;
  const memoryContext = userMemory ? `\n\n[الذاكرة طويلة المدى عن المستخدم]:\n${userMemory}` : "";
  const fullInstruction = `${baseInstruction}${memoryContext}`;

  // 3. Always use Google Gemini
  const finalApiKey = defaultApiKey;
  if (!finalApiKey) {
    console.error("GEMINI_API_KEY is missing.");
    throw new Error("عذراً، مفتاح الـ API الخاص بـ Gemini غير متوفر في البيئة.");
  }

  const genAI = new GoogleGenAI({ apiKey: finalApiKey });

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...history, { role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: fullInstruction,
      }
    });

    if (!response || !response.text) {
      throw new Error("لم يتم استلام رد من النموذج.");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`حدث خطأ في نموذج Gemini: ${error.message || error}`);
  }
};
