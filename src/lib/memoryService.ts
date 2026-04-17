import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenAI({ apiKey });

export const getUserMemory = async (userId: string): Promise<string> => {
  try {
    const memoryDoc = await getDoc(doc(db, 'users', userId, 'config', 'memory'));
    if (memoryDoc.exists()) {
      return memoryDoc.data().content || "";
    }
  } catch (error) {
    console.error("Error fetching memory:", error);
  }
  return "";
};

export const updateLongTermMemory = async (userId: string, currentExchange: string, existingMemory: string) => {
  if (!apiKey) return;

  try {
    const prompt = `
      الأمر: أنت مسؤول عن تحديث "الذاكرة طويلة المدى" للمستخدم. 
      الذاكرة الحالية: "${existingMemory}"
      التبادل الأخير: "${currentExchange}"
      
      المهمة: قم باستخراج المعلومات الجديدة المهمة عن المستخدم (الاهتمامات، الاسم، التفضيلات، الحقائق الشخصية) من التبادل الأخير ودمجها مع الذاكرة الحالية. 
      القواعد:
      1. كن موجزاً ومركزاً.
      2. لا تكرر المعلومات.
      3. إذا لم تكن هناك معلومات جديدة، أعد الذاكرة الحالية كما هي.
      4. اكتب الذاكرة باللغة العربية.
      
      الذاكرة المحدثة النهائية:
    `;

    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const newMemory = response.text;
    if (newMemory && newMemory !== existingMemory) {
      await setDoc(doc(db, 'users', userId, 'config', 'memory'), {
        content: newMemory,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return newMemory;
    }
  } catch (error) {
    console.error("Error updating memory:", error);
  }
  return existingMemory;
};
