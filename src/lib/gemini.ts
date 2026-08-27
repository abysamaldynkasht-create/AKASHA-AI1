import { GoogleGenAI } from "@google/genai";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

// New KAI-1 Endpoints
export const KAI1_BASE_URL = "https://ted-jeffrey-numerical-lot.trycloudflare.com";
export const KAI1_STREAM_URL = `${KAI1_BASE_URL}/api/kai1/stream`;
export const KAI1_CHAT_URL = `${KAI1_BASE_URL}/api/kai1/chat`;

// Default fallback key from environment
const defaultApiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";

export interface ChatAttachment {
  name: string;
  type: string;
  data: string;
  isImage?: boolean;
  size?: number;
}

/**
 * Streams response directly from KAI-1 model (Akasha AI) with fallback to Gemini Multimodal.
 */
export const getAIResponseStream = async (
  prompt: string,
  history: { role: string; parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] }[] = [],
  userMemory: string = "",
  userId: string = "",
  attachments: ChatAttachment[] = [],
  onChunk?: (accumulatedText: string) => void
): Promise<string> => {
  // 1. Fetch user custom prompt/instruction from Firestore
  let customSystemInstruction = "";

  if (userId) {
    try {
      const aiSnap = await getDoc(doc(db, "users", userId, "config", "ai"));
      if (aiSnap.exists()) {
        const aiData = aiSnap.data();
        customSystemInstruction = aiData.systemInstruction || "";
      }
    } catch (error) {
      console.warn("Could not load user AI settings:", error);
    }
  }

  // 2. Prepare full system instruction including long-term memory
  const baseInstruction =
    customSystemInstruction ||
    `أنت Akasha AI (نموذج KAI-1)، المساعد الذكي التابع لمنظومة Akasha AI. تجيب بذكاء ودقة وسرعة وبأسلوب راقٍ وواضح، وتدعم اللغتين العربية والإنجليزية، وقادر على تحليل الصور والملفات والأكواد بدقة فائقة.`;
  const memoryContext = userMemory ? `\n\n[الذاكرة طويلة المدى عن المستخدم]:\n${userMemory}` : "";
  const fullInstruction = `${baseInstruction}${memoryContext}`;

  const hasImageAttachment = attachments.some(a => a.isImage || a.type.startsWith('image/') || a.type === 'application/pdf');

  // If text attachments exist, append their text content to the prompt
  let augmentedPrompt = prompt;
  const textAttachments = attachments.filter(a => !a.isImage && !a.type.startsWith('image/') && a.type !== 'application/pdf');
  if (textAttachments.length > 0) {
    const fileTexts = textAttachments.map(f => `\n[محتوى الملف المرفق: ${f.name}]\n\`\`\`\n${f.data}\n\`\`\``).join('\n\n');
    augmentedPrompt = `${fileTexts}\n\n${prompt || 'يرجى مراجعة وتحليل هذا الملف.'}`;
  }

  // Formatted history matching KAI-1 schema
  const formattedHistory = history.map((msg) => ({
    role: msg.role === "model" || msg.role === "assistant" ? "assistant" : "user",
    content: msg.parts[0]?.text || "",
  }));

  // 3. If there are NO image attachments, try primary KAI-1 Streaming Endpoint first
  if (!hasImageAttachment) {
    try {
      const payload = {
        message: augmentedPrompt || "مرحباً",
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
        console.warn(`KAI-1 stream returned status: ${response.status}. Attempting direct chat endpoint.`);
      }
    } catch (kaiError) {
      console.warn("KAI-1 streaming error, attempting direct chat:", kaiError);
    }

    // 3.1 Try KAI-1 Direct Chat endpoint if stream was bypassed
    try {
      const chatPayload = {
        message: augmentedPrompt || "مرحباً",
        history: formattedHistory,
        system_instruction: fullInstruction,
      };

      const chatResponse = await fetch(KAI1_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chatPayload),
      });

      if (chatResponse.ok) {
        const data = await chatResponse.json();
        const text = data?.reply || data?.response || data?.message || data?.text || (typeof data === "string" ? data : "");
        if (text && text.trim().length > 0) {
          if (onChunk) onChunk(text);
          return text;
        }
      }
    } catch (chatError) {
      console.warn("KAI-1 chat endpoint error:", chatError);
    }
  }

  // 4. Secondary/Multimodal: Google Gemini SDK for multimodal vision & fallback
  if (!defaultApiKey) {
    throw new Error("تعذر الاتصال بنموذج الذكاء الاصطناعي.");
  }

  const genAI = new GoogleGenAI({ apiKey: defaultApiKey });
  const fallbackModels = ["gemini-3.7-flash", "gemini-2.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  // Build current turn parts (including images/attachments)
  const currentParts: any[] = [];
  for (const att of attachments) {
    if (att.isImage || att.type.startsWith('image/') || att.type === 'application/pdf') {
      const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
      currentParts.push({
        inlineData: {
          mimeType: att.type || 'image/jpeg',
          data: base64Data,
        }
      });
    }
  }
  if (augmentedPrompt) {
    currentParts.push({ text: augmentedPrompt });
  } else if (currentParts.length === 0) {
    currentParts.push({ text: "تحليل المرفق" });
  }

  for (const fallbackModel of fallbackModels) {
    try {
      const fallbackResponse = await genAI.models.generateContent({
        model: fallbackModel,
        contents: [...history, { role: "user", parts: currentParts }],
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
      console.warn(`Fallback to model ${fallbackModel} failed:`, err);
    }
  }

  throw new Error(`تعذر معالجة الطلب: ${lastError?.message || "النموذج غير متاح حالياً"}`);
};

/**
 * Standard non-streaming wrapper for backward compatibility.
 */
export const getGeminiResponse = async (
  prompt: string,
  history: { role: string; parts: { text?: string }[] }[] = [],
  userMemory: string = "",
  userId: string = "",
  attachments: ChatAttachment[] = []
): Promise<string> => {
  return getAIResponseStream(prompt, history as any, userMemory, userId, attachments);
};
