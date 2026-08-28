import { GoogleGenAI } from "@google/genai";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { UserSubscription } from "../types";

// KAI-1 Endpoints
export const KAI1_BASE_URL = "https://maiden-sacramento-tab-medications.trycloudflare.com";
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

export class LimitExceededError extends Error {
  plan: string;
  usage_limit: number;
  usage_count: number;
  constructor(message: string, plan = 'free', usage_limit = 20, usage_count = 20) {
    super(message);
    this.name = 'LimitExceededError';
    this.plan = plan;
    this.usage_limit = usage_limit;
    this.usage_count = usage_count;
  }
}

/**
 * Streams response via Backend Secure Proxy with full subscription verification,
 * fallback to direct KAI-1 and Gemini.
 */
export const getAIResponseStream = async (
  prompt: string,
  history: { role: string; parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] }[] = [],
  userMemory: string = "",
  userId: string = "",
  attachments: ChatAttachment[] = [],
  onChunk?: (accumulatedText: string) => void,
  clientSubscription?: Partial<UserSubscription> | null
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

  // 2. Try Backend Secure Streaming Proxy first (Checks backend limits & handles authentication)
  try {
    const backendResponse = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        prompt,
        history,
        systemInstruction: customSystemInstruction,
        userMemory,
        attachments,
        clientSubscription,
      }),
    });

    if (backendResponse.status === 429) {
      const errData = await backendResponse.json();
      throw new LimitExceededError(
        errData.message || "لقد استنفدت الحد المسموح به للرسائل.",
        errData.plan,
        errData.usage_limit,
        errData.usage_count
      );
    }

    if (backendResponse.ok && backendResponse.body) {
      const reader = backendResponse.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === "chunk" && parsed.text) {
                accumulatedText += parsed.text;
                if (onChunk) onChunk(accumulatedText);
              } else if (parsed.type === "error") {
                console.warn("Stream event error:", parsed.error);
              }
            } catch (e) {
              // Ignore line parse error
            }
          }
        }
      }

      if (accumulatedText.trim().length > 0) {
        return accumulatedText;
      }
    }
  } catch (proxyError: any) {
    if (proxyError instanceof LimitExceededError) {
      throw proxyError;
    }
    console.warn("Backend proxy stream failed, falling back to direct pipeline:", proxyError);
  }

  // 3. Fallback to Direct KAI-1 / Gemini client pipeline
  const isPro = clientSubscription?.plan === 'pro' && clientSubscription?.subscription_status === 'active';
  const tierName = isPro ? 'KAI-1 Pro Ultra' : 'KAI-1 Standard';
  const baseInstruction =
    customSystemInstruction ||
    `أنت Akasha AI (نموذج ${tierName})، المساعد الذكي التابع لمنظومة Akasha AI. تجيب بذكاء ودقة وسرعة وبأسلوب راقٍ وواضح، وتدعم اللغتين العربية والإنجليزية.`;
  const memoryContext = userMemory ? `\n\n[الذاكرة طويلة المدى]:\n${userMemory}` : "";
  const fullInstruction = `${baseInstruction}${memoryContext}`;

  const hasImageAttachment = attachments.some(a => a.isImage || a.type.startsWith('image/') || a.type === 'application/pdf');

  let augmentedPrompt = prompt;
  const textAttachments = attachments.filter(a => !a.isImage && !a.type.startsWith('image/') && a.type !== 'application/pdf');
  if (textAttachments.length > 0) {
    const fileTexts = textAttachments.map(f => `\n[محتوى الملف المرفق: ${f.name}]\n\`\`\`\n${f.data}\n\`\`\``).join('\n\n');
    augmentedPrompt = `${fileTexts}\n\n${prompt || 'يرجى مراجعة وتحليل هذا الملف.'}`;
  }

  const formattedHistory = history.map((msg) => ({
    role: msg.role === "model" || msg.role === "assistant" ? "assistant" : "user",
    content: msg.parts[0]?.text || "",
  }));

  if (!hasImageAttachment) {
    try {
      const payload = {
        message: augmentedPrompt || "مرحباً",
        history: formattedHistory,
        system_instruction: fullInstruction,
      };

      const response = await fetch(KAI1_STREAM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      }
    } catch (kaiError) {
      console.warn("Direct KAI-1 stream error:", kaiError);
    }
  }

  // 4. Gemini SDK Multimodal Fallback
  if (!defaultApiKey) {
    throw new Error("تعذر الاتصال بنموذج الذكاء الاصطناعي.");
  }

  const genAI = new GoogleGenAI({ apiKey: defaultApiKey });
  const modelToUse = isPro ? 'gemini-3.7-flash' : 'gemini-2.5-flash';

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

  const fallbackResponse = await genAI.models.generateContent({
    model: modelToUse,
    contents: [...history, { role: "user", parts: currentParts }],
    config: { systemInstruction: fullInstruction },
  });

  const text = fallbackResponse.text || "";
  if (onChunk) onChunk(text);
  return text;
};

export const getGeminiResponse = async (
  prompt: string,
  history: { role: string; parts: { text?: string }[] }[] = [],
  userMemory: string = "",
  userId: string = "",
  attachments: ChatAttachment[] = [],
  clientSubscription?: Partial<UserSubscription> | null
): Promise<string> => {
  return getAIResponseStream(prompt, history as any, userMemory, userId, attachments, undefined, clientSubscription);
};
