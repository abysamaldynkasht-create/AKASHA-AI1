import { GoogleGenAI } from "@google/genai";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

// KAI-1 Streaming Endpoint
export const KAI1_STREAM_URL = "https://sized-pour-publish-stretch.trycloudflare.com/api/kai1/stream";

// Akasha Custom API Configuration
const CUSTOM_API_KEY = "ak_live_okasha_essam_50f8373a01db7cc2b";
const CUSTOM_BASE_URL = "https://api.akasha.ai/v1";

// Default Gemini API Key from environment as fallback
const defaultApiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";

/**
 * Streams response from KAI-1 model with fallbacks to Akasha API and Gemini SDK.
 */
export const getAIResponseStream = async (
  prompt: string,
  history: { role: string; parts: { text: string }[] }[] = [],
  userMemory: string = "",
  userId: string = "",
  onChunk?: (accumulatedText: string) => void
): Promise<string> => {
  // 1. Fetch user custom prompt/instruction from Firestore
  let customSystemInstruction = "";
  let modelName = "kai-1";

  if (userId) {
    try {
      const aiSnap = await getDoc(doc(db, "users", userId, "config", "ai"));
      if (aiSnap.exists()) {
        const aiData = aiSnap.data();
        customSystemInstruction = aiData.systemInstruction || "";
        if (aiData.model && aiData.model !== "gemini-3-flash-preview") {
          modelName = aiData.model;
        }
      }
    } catch (error) {
      console.warn("Could not load user AI settings:", error);
    }
  }

  // 2. Prepare full system instruction including long-term memory
  const baseInstruction =
    customSystemInstruction ||
    `أنت Akasha AI (نموذج KAI-1)، مساعد ذكي فائق الدقة وسريع الاستجابة. تجيب بوضوح وإيجاز وتدعم اللغتين العربية والإنجليزية بشكل ممتاز.`;
  const memoryContext = userMemory ? `\n\n[الذاكرة طويلة المدى عن المستخدم]:\n${userMemory}` : "";
  const fullInstruction = `${baseInstruction}${memoryContext}`;

  // Formatted history for KAI-1 & OpenAI compatible payloads
  const formattedHistory = history.map((msg) => ({
    role: msg.role === "model" || msg.role === "assistant" ? "assistant" : "user",
    content: msg.parts[0]?.text || "",
  }));

  // 3. Primary: Try KAI-1 Streaming Endpoint
  try {
    const payload = {
      message: prompt,
      history: formattedHistory,
      system_instruction: fullInstruction,
    };

    const response = await fetch(KAI1_STREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        if (onChunk) {
          onChunk(accumulatedText);
        }
      }

      if (accumulatedText.trim().length > 0) {
        return accumulatedText;
      }
    } else {
      console.warn(`KAI-1 stream returned status ${response.status}. Trying next provider...`);
    }
  } catch (kaiError) {
    console.warn("KAI-1 streaming connection error, trying fallback:", kaiError);
  }

  // 4. Secondary: Try Akasha Custom OpenAI-compatible endpoint
  try {
    const messages = [
      { role: "system", content: fullInstruction },
      ...formattedHistory,
      { role: "user", content: prompt },
    ];

    const response = await fetch(`${CUSTOM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CUSTOM_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.choices?.[0]?.message?.content) {
        const text = data.choices[0].message.content;
        if (onChunk) onChunk(text);
        return text;
      }
    }
  } catch (akashaError) {
    console.warn("Akasha custom endpoint fallback error:", akashaError);
  }

  // 5. Tertiary: Fallback to Google Gemini SDK
  if (!defaultApiKey) {
    throw new Error("تعذر الاتصال بنموذج KAI-1 والمفتاح الاحتياطي غير متوفر.");
  }

  const genAI = new GoogleGenAI({ apiKey: defaultApiKey });

  const fallbackModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  for (const fallbackModel of fallbackModels) {
    try {
      const fallbackResponse = await genAI.models.generateContent({
        model: fallbackModel,
        contents: [...history, { role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: fullInstruction,
        },
      });

      if (fallbackResponse?.text) {
        const text = fallbackResponse.text;
        if (onChunk) onChunk(text);
        return text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Fallback to ${fallbackModel} failed:`, err);
    }
  }

  throw new Error(`حدث خطأ أثناء معالجة طلبك: ${lastError?.message || "النموذج غير متاح حالياً"}`);
};

/**
 * Standard non-streaming wrapper for backward compatibility.
 */
export const getGeminiResponse = async (
  prompt: string,
  history: { role: string; parts: { text: string }[] }[] = [],
  userMemory: string = "",
  userId: string = ""
): Promise<string> => {
  return getAIResponseStream(prompt, history, userMemory, userId);
};
