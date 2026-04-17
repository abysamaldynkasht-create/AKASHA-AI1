import React, { useState, useEffect, useRef } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getGeminiResponse } from '../lib/gemini';
import { getUserMemory, updateLongTermMemory } from '../lib/memoryService';
import { Send, Bot, User as UserIcon, Loader2, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { LOGO_URL as DEFAULT_LOGO_URL } from '../constants';

interface ChatProps {
  sessionId: string | null;
  onSessionCreated: (id: string) => void;
}

export const Chat: React.FC<ChatProps> = ({ sessionId, onSessionCreated }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userMemory, setUserMemory] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const [logoError, setLogoError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'app_config', 'settings'), (snapshot) => {
      if (snapshot.exists() && snapshot.data().logoUrl) {
        setLogoUrl(snapshot.data().logoUrl);
        setLogoError(false);
      }
    });

    const handleLocalUpdate = (e: any) => {
      if (e.detail?.logoUrl) {
        setLogoUrl(e.detail.logoUrl);
        setLogoError(false);
      }
    };
    window.addEventListener('configUpdated', handleLocalUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('configUpdated', handleLocalUpdate);
    };
  }, []);

  useEffect(() => {
    if (!user || !sessionId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'sessions', sessionId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(messageList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/sessions/${sessionId}/messages`);
    });

    return () => unsubscribe();
  }, [user, sessionId]);

  useEffect(() => {
    const fetchMemory = async () => {
      if (user) {
        const memory = await getUserMemory(user.uid);
        setUserMemory(memory);
      }
    };
    fetchMemory();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      setError(null);
      let currentSessionId = sessionId;

      // Create session if it doesn't exist
      if (!currentSessionId) {
        const sessionRef = await addDoc(collection(db, 'users', user.uid, 'sessions'), {
          userId: user.uid,
          title: userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : ''),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        currentSessionId = sessionRef.id;
        onSessionCreated(currentSessionId);
      }

      // Add user message
      await addDoc(collection(db, 'users', user.uid, 'sessions', currentSessionId, 'messages'), {
        sessionId: currentSessionId,
        role: 'user',
        content: userMessage,
        createdAt: new Date().toISOString(),
      });

      // Update session updatedAt
      await updateDoc(doc(db, 'users', user.uid, 'sessions', currentSessionId), {
        updatedAt: new Date().toISOString(),
      });

      // Get Gemini response
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const aiResponse = await getGeminiResponse(userMessage, history, userMemory);

      // Add AI message
      await addDoc(collection(db, 'users', user.uid, 'sessions', currentSessionId, 'messages'), {
        sessionId: currentSessionId,
        role: 'assistant',
        content: aiResponse,
        createdAt: new Date().toISOString(),
      });

      // Update long term memory in background
      updateLongTermMemory(user.uid, `المستخدم: ${userMessage}\nالمساعد: ${aiResponse}`, userMemory).then(newMemory => {
        if (newMemory) setUserMemory(newMemory);
      });

    } catch (err: any) {
      console.error("Chat Error:", err);
      setError(err.message || "حدث خطأ غير متوقع.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-dark text-[#F5F5DC] relative" dir="rtl">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 space-y-6 md:space-y-8 custom-scrollbar">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 md:space-y-6 opacity-80 px-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-primary rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center mb-2 md:mb-4 shadow-2xl shadow-primary/20 overflow-hidden">
              {logoUrl && !logoError ? (
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-cover" 
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-white font-black text-2xl md:text-3xl">AK</span>
              )}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter">أهلاً بك في Akasha AI 0.1</h2>
              <p className="max-w-md text-[#A0A0A0] font-medium text-sm md:text-base">
                مساعدك الذكي المتكامل للتعلم، البرمجة، وتوليد الأفكار. كيف يمكنني مساعدتك اليوم؟
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl pt-4 md:pt-8">
              <SuggestionCard text="اشرح لي مفهوم الذكاء الاصطناعي" onClick={() => setInput('اشرح لي مفهوم الذكاء الاصطناعي')} />
              <SuggestionCard text="ساعدني في كتابة كود Python" onClick={() => setInput('ساعدني في كتابة كود Python')} />
              <SuggestionCard text="اقترح أفكاراً لمشروع جديد" onClick={() => setInput('اقترح أفكاراً لمشروع جديد')} />
              <SuggestionCard text="كيف أحسن مهاراتي في التعلم؟" onClick={() => setInput('كيف أحسن مهاراتي في التعلم؟')} />
            </div>
          </div>
        )}

        {messages.map((message) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={message.id}
            className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg overflow-hidden ${
              message.role === 'assistant' ? 'bg-primary text-white' : 'bg-white/10 text-white'
            }`}>
              {message.role === 'assistant' ? (
                logoUrl && !logoError ? (
                  <img 
                    src={logoUrl} 
                    alt="AI" 
                    className="w-full h-full object-cover" 
                    onError={() => setLogoError(true)}
                  />
                ) : <Bot size={20} />
              ) : <UserIcon size={20} />}
            </div>
            <div
              className={`max-w-[90%] md:max-w-[85%] lg:max-w-[75%] p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-xl ${
                message.role === 'user'
                  ? 'bg-primary text-white rounded-tl-none'
                  : 'bg-white/5 text-[#F5F5DC] rounded-tr-none border border-white/5 backdrop-blur-sm'
              }`}
            >
              <div className="prose prose-invert text-sm md:text-base">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 mt-1 shadow-lg overflow-hidden">
              {logoUrl && !logoError ? (
                <img 
                  src={logoUrl} 
                  alt="AI" 
                  className="w-full h-full object-cover" 
                  onError={() => setLogoError(true)}
                />
              ) : <Bot size={20} className="text-white" />}
            </div>
            <div className="bg-white/5 p-5 rounded-3xl rounded-tr-none border border-white/5 backdrop-blur-sm">
              <div className="flex gap-1">
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 md:p-8 lg:p-12 bg-gradient-to-t from-bg-dark via-bg-dark to-transparent">
        {error && (
          <div className="max-w-4xl mx-auto mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl md:rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسأل Akasha AI أي شيء..."
            className="relative w-full bg-white/5 border border-white/10 rounded-2xl md:rounded-[2rem] py-4 md:py-5 pr-6 md:pr-8 pl-14 md:pl-16 text-[#F5F5DC] focus:outline-none focus:border-primary/50 transition-all placeholder-[#606060] backdrop-blur-xl text-sm md:text-base"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-primary text-white rounded-xl md:rounded-2xl hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            <Send size={20} className="rotate-180" />
          </button>
        </form>
        <div className="text-center mt-6 space-y-2">
          <p className="text-[8px] md:text-[10px] text-[#404040] uppercase tracking-[0.2em] md:tracking-[0.4em] font-black">
            Akasha AI 0.1 - Intelligence Redefined
          </p>
          <p className="text-[10px] md:text-xs text-[#606060] font-medium">
            Akasha هو نموذج ذكاء اصطناعي و قد ينتج عنه اخطاء
          </p>
        </div>
      </div>
    </div>
  );
};

const SuggestionCard = ({ text, onClick }: { text: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="p-4 bg-white/5 border border-white/5 rounded-2xl text-sm font-medium text-[#A0A0A0] hover:bg-white/10 hover:border-primary/30 hover:text-[#F5F5DC] transition-all text-right"
  >
    {text}
  </button>
);
