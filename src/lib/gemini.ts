import { GoogleGenAI } from "@google/genai";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

// High-performance custom configurations for Akasha AI
const CUSTOM_API_KEY = "ak_live_okasha_essam_50f8373a01db7cc2b";
const CUSTOM_BASE_URL = "https://api.akasha.ai/v1";

// Default API Key from environment as a reliable fallback
const defaultApiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";

export const getGeminiResponse = async (
  prompt: string, 
  history: { role: string, parts: { text: string }[] }[] = [], 
  userMemory: string = "",
  userId: string = ""
) => {
  // 1. Fetch User Custom AI Settings from Firestore if userId is present
  let customSystemInstruction = '';
  let modelName = 'akasha-ai';

  if (userId) {
    try {
      const aiSnap = await getDoc(doc(db, 'users', userId, 'config', 'ai'));
      if (aiSnap.exists()) {
        const aiData = aiSnap.data();
        customSystemInstruction = aiData.systemInstruction || '';
        if (aiData.model && aiData.model !== 'gemini-3-flash-preview') {
          modelName = aiData.model;
        }
      }
    } catch (error) {
      console.warn("Could not load user AI settings:", error);
    }
  }

  // 2. Prepare system instructions
  const baseInstruction = customSystemInstruction || `You are Akasha AI 0.1, a highly intelligent and helpful assistant. You provide clear, accurate, and concise answers. You support both Arabic and English. Your design is modern and your personality is professional yet friendly.`;
  const memoryContext = userMemory ? `\n\n[الذاكرة طويلة المدى عن المستخدم]:\n${userMemory}` : "";
  const fullInstruction = `${baseInstruction}${memoryContext}`;

  // 3. Try to call the custom Akasha AI Endpoint first
  try {
    // Map conversation history to standard chat completion schema
    const openaiMessages = history.map(msg => ({
      role: msg.role === "model" ? "assistant" : "user",
      content: msg.parts[0]?.text || ""
    }));

    const messages = [
      { role: "system", content: fullInstruction },
      ...openaiMessages,
      { role: "user", content: prompt }
    ];

    const response = await fetch(`${CUSTOM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CUSTOM_API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.7,
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
    } else {
      const errorText = await response.text();
      console.warn(`Akasha API response error (Status ${response.status}): ${errorText}. Falling back to default Gemini SDK if available.`);
    }
  } catch (error) {
    console.warn("Akasha API request failed, trying fallback to custom Gemini API:", error);
  }

  // 4. Fallback to native GoogleGenAI SDK if custom endpoint is unavailable and defaultApiKey is present
  if (!defaultApiKey) {
    console.error("GEMINI_API_KEY is missing for fallback.");
    throw new Error("عذراً، تعذر الاتصال بمزود الذكاء الاصطناعي الرئيسي والمفتاح الاحتياطي غير متوفر.");
  }

  const genAI = new GoogleGenAI({ apiKey: defaultApiKey });

  try {
    const fallbackResponse = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...history, { role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: fullInstruction,
      }
    });

    if (!fallbackResponse || !fallbackResponse.text) {
      throw new Error("لم يتم استلام رد من النموذج الاحتياطي.");
    }

    return fallbackResponse.text;
  } catch (error: any) {
    console.error("Gemini Fallback API Error:", error);
    throw new Error(`حدث خطأ أثناء معالجة طلبك: ${error.message || error}`);
  }
};
