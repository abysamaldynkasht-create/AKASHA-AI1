import React, { useState, useEffect, useRef } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getAIResponseStream, ChatAttachment, LimitExceededError } from '../lib/gemini';
import { getUserMemory, updateLongTermMemory } from '../lib/memoryService';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Sparkles, 
  Camera, 
  Paperclip, 
  FileText, 
  Image as ImageIcon, 
  X, 
  Maximize2, 
  FileCode,
  AlertCircle,
  Crown,
  Zap,
  Lock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { LOGO_URL as DEFAULT_LOGO_URL } from '../constants';
import { CameraModal } from './CameraModal';

interface ChatProps {
  sessionId: string | null;
  onSessionCreated: (id: string) => void;
}

interface DisplayAttachment {
  name: string;
  type: string;
  data: string; // base64 data url or text
  isImage: boolean;
  size?: number;
}

export const Chat: React.FC<ChatProps> = ({ sessionId, onSessionCreated }) => {
  const { 
    user, 
    profile, 
    isPro, 
    effectivePlan, 
    usageCount, 
    usageLimit, 
    remainingRequests, 
    imageCount,
    imageLimit,
    remainingImages,
    isAdmin, 
    incrementUsage, 
    incrementImageUsage,
    openPricingModal 
  } = useAuth();

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<DisplayAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [userMemory, setUserMemory] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const [logoError, setLogoError] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [messages, streamingText]);

  // File Upload Handlers
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxFileSize = isPro ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB for PRO, 5MB for FREE

    const fileArray = Array.from(files);
    const newImageFiles = fileArray.filter(f => f.type.startsWith('image/'));
    const currentStagedImages = attachments.filter(a => a.isImage).length;

    // Check image limits
    if (!isAdmin && newImageFiles.length > 0) {
      if (imageCount + currentStagedImages >= imageLimit) {
        setLimitWarning(`لقد استنفدت الحد اليومي المسموح به لرفع الصور (${imageLimit} صور يومياً). ${!isPro ? 'الخطة المجانية تتيح 10 صور يومياً. قم بالترقية إلى PRO لرفع صور ومستندات غير محدودة.' : ''}`);
        openPricingModal();
        return;
      }

      if (imageCount + currentStagedImages + newImageFiles.length > imageLimit) {
        const availableSlots = Math.max(0, imageLimit - (imageCount + currentStagedImages));
        alert(`يمكنك رفع ${availableSlots} صور إضافية فقط اليوم (الحد الأقصى ${imageLimit} صور يومياً). قم بالترقية إلى PRO لإلغاء القيود.`);
        return;
      }
    }

    fileArray.forEach((file) => {
      if (file.size > maxFileSize) {
        alert(`حجم الملف ${file.name} يتجاوز الحد المسموح (${isPro ? '50MB' : '5MB'}). ${!isPro ? 'قم بالترقية إلى PRO لرفع ملفات حتى 50MB.' : ''}`);
        return;
      }

      const isImg = file.type.startsWith('image/');
      const reader = new FileReader();

      if (isImg) {
        reader.onload = (e) => {
          if (e.target?.result) {
            setAttachments((prev) => [
              ...prev,
              {
                name: file.name,
                type: file.type,
                data: e.target?.result as string,
                isImage: true,
                size: file.size,
              },
            ]);
          }
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        reader.onload = (e) => {
          if (e.target?.result) {
            setAttachments((prev) => [
              ...prev,
              {
                name: file.name,
                type: file.type,
                data: e.target?.result as string,
                isImage: false,
                size: file.size,
              },
            ]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Text / code files
        reader.onload = (e) => {
          if (e.target?.result) {
            setAttachments((prev) => [
              ...prev,
              {
                name: file.name,
                type: file.type || 'text/plain',
                data: e.target?.result as string,
                isImage: false,
                size: file.size,
              },
            ]);
          }
        };
        reader.readAsText(file);
      }
    });
  };

  const handleCameraCapture = (imageDataUrl: string) => {
    const currentStagedImages = attachments.filter(a => a.isImage).length;
    if (!isAdmin && (imageCount + currentStagedImages + 1) > imageLimit) {
      setLimitWarning(`لقد استنفدت الحد اليومي المسموح به لرفع الصور (${imageLimit} صور يومياً). ${!isPro ? 'الخطة المجانية تتيح 10 صور يومياً. قم بالترقية إلى PRO لرفع صور ومستندات غير محدودة.' : ''}`);
      openPricingModal();
      return;
    }

    setAttachments((prev) => [
      ...prev,
      {
        name: `camera_snapshot_${Date.now()}.jpg`,
        type: 'image/jpeg',
        data: imageDataUrl,
        isImage: true,
        size: Math.round(imageDataUrl.length * 0.75),
      },
    ]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || !user || isLoading) return;

    // Check client-side quota limit before initiating request
    if (!isAdmin && remainingRequests <= 0) {
      setLimitWarning(`لقد استنفدت حد ${usageLimit} رسالة لليوم في الخطة المجانية. قم بالترقية إلى PRO للمتابعة بلا انقطاع.`);
      openPricingModal();
      return;
    }

    const currentAttachments = [...attachments];
    const imageAttachmentsCount = currentAttachments.filter(a => a.isImage || a.type.startsWith('image/')).length;

    // Check image upload limit before sending
    if (!isAdmin && imageAttachmentsCount > 0 && (imageCount + imageAttachmentsCount) > imageLimit) {
      setLimitWarning(`لقد استنفدت الحد اليومي لرفع الصور (${imageLimit} صور يومياً في الخطة المجانية). قم بالترقية إلى PRO لرفع وتحليل صور غير محدودة.`);
      openPricingModal();
      return;
    }

    const userMessage = input.trim();

    setInput('');
    setAttachments([]);
    setIsLoading(true);
    setStreamingText(null);
    setError(null);
    setLimitWarning(null);

    try {
      let currentSessionId = sessionId;

      // Create session if it doesn't exist
      if (!currentSessionId) {
        const titleText = userMessage || (currentAttachments[0]?.name ? `ملف: ${currentAttachments[0].name}` : 'محادثة جديدة');
        const sessionRef = await addDoc(collection(db, 'users', user.uid, 'sessions'), {
          userId: user.uid,
          title: titleText.slice(0, 30) + (titleText.length > 30 ? '...' : ''),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        currentSessionId = sessionRef.id;
        onSessionCreated(currentSessionId);
      }

      // Prepare attachments for storing
      const storedAttachments = currentAttachments.map(att => ({
        name: att.name,
        type: att.type,
        data: att.data,
        isImage: att.isImage,
        size: att.size,
      }));

      // Add user message to Firestore
      await addDoc(collection(db, 'users', user.uid, 'sessions', currentSessionId, 'messages'), {
        sessionId: currentSessionId,
        role: 'user',
        content: userMessage,
        attachments: storedAttachments,
        createdAt: new Date().toISOString(),
      });

      // Update session updatedAt
      await updateDoc(doc(db, 'users', user.uid, 'sessions', currentSessionId), {
        updatedAt: new Date().toISOString(),
      });

      // Map conversation history
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      // Call streaming KAI-1 / AI API with subscription verification
      const finalResponse = await getAIResponseStream(
        userMessage,
        history,
        userMemory,
        user.uid,
        currentAttachments as ChatAttachment[],
        (chunk) => {
          setStreamingText(chunk);
        },
        profile
      );

      // Increment usage counts locally & in DB
      await incrementUsage();
      if (imageAttachmentsCount > 0) {
        await incrementImageUsage(imageAttachmentsCount);
      }

      // Add final assistant message to Firestore
      await addDoc(collection(db, 'users', user.uid, 'sessions', currentSessionId, 'messages'), {
        sessionId: currentSessionId,
        role: 'assistant',
        content: finalResponse,
        createdAt: new Date().toISOString(),
      });

      // Update long term memory in background
      const memoryContext = `${userMessage} ${currentAttachments.map(a => `[مرفق: ${a.name}]`).join(' ')}`;
      updateLongTermMemory(user.uid, `المستخدم: ${memoryContext}\nالمساعد: ${finalResponse}`, userMemory).then(newMemory => {
        if (newMemory) setUserMemory(newMemory);
      });

    } catch (err: any) {
      console.error("Chat Error:", err);
      if (err instanceof LimitExceededError) {
        setLimitWarning(err.message);
        openPricingModal();
      } else {
        setError(err.message || "حدث خطأ أثناء الاتصال بالنموذج.");
      }
    } finally {
      setIsLoading(false);
      setStreamingText(null);
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-bg-dark text-[#F5F5DC] relative overflow-hidden" 
      dir="rtl"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Visual Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-primary/20 backdrop-blur-sm border-2 border-dashed border-primary flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center text-white shadow-2xl mb-3">
              <Paperclip size={32} />
            </div>
            <h3 className="text-xl font-black text-white">إفلات الملفات للرفع</h3>
            <p className="text-sm text-[#F5F5DC]/80 mt-1">الصور، المستندات، ملفات الأكواد والنصوص</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 lg:p-10 space-y-4 sm:space-y-6 md:space-y-8 custom-scrollbar">
        {messages.length === 0 && !isLoading && !streamingText && (
          <div className="min-h-[65vh] flex flex-col items-center justify-center text-center space-y-3 sm:space-y-5 opacity-90 px-3 sm:px-4 my-auto">
            <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-primary rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-1 shadow-2xl shadow-primary/20 overflow-hidden flex-shrink-0">
              {logoUrl && !logoError ? (
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-cover" 
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-white font-black text-xl sm:text-3xl">AK</span>
              )}
            </div>
            <div className="space-y-1.5 sm:space-y-2 max-w-md">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">أهلاً بك في Akasha AI</h2>
              <p className="text-[#A0A0A0] font-medium text-xs sm:text-sm md:text-base leading-relaxed">
                مساعدك الذكي المتكامل المدعوم بنموذج KAI-1 مع دعم الرؤية الحاسوبية، الصوت، تحليل الملفات، وذاكرة سياقية طويلة المدى.
              </p>
            </div>

            {/* Quick Starter Suggestions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full max-w-xl pt-3 sm:pt-6">
              <SuggestionCard text="التقط صورة واطلب تحليلها" onClick={() => setIsCameraOpen(true)} />
              <SuggestionCard text="ارفع ملف كود أو مستند لتحليله" onClick={() => fileInputRef.current?.click()} />
              <SuggestionCard text="اشرح لي بنية نموذج KAI-1" onClick={() => setInput('اشرح لي بنية وميزات نموذج KAI-1 المتطور')} />
              <SuggestionCard text="اكتب كود بايثون متقدم لحل مشكلة" onClick={() => setInput('اكتب كود بايثون متقدم لمعالجة البيانات')} />
            </div>
          </div>
        )}

        {messages.map((message) => (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            key={message.id}
            className={`flex gap-2.5 sm:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md overflow-hidden ${
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
                ) : <Bot size={18} />
              ) : <UserIcon size={18} />}
            </div>
            
            <div
              className={`max-w-[94%] sm:max-w-[85%] lg:max-w-[75%] p-3 sm:p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-lg break-words overflow-x-auto ${
                message.role === 'user'
                  ? 'bg-primary text-white rounded-tl-none'
                  : 'bg-white/5 text-[#F5F5DC] rounded-tr-none border border-white/5 backdrop-blur-sm'
              }`}
            >
              {/* Render User Attached Media if present */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2.5">
                  {message.attachments.map((att: any, idx: number) => (
                    att.isImage || att.type?.startsWith('image/') ? (
                      <div 
                        key={idx} 
                        className="relative group rounded-xl overflow-hidden border border-white/15 bg-black/30 max-w-[200px] cursor-pointer"
                        onClick={() => setPreviewImage(att.data)}
                      >
                        <img 
                          src={att.data} 
                          alt={att.name || 'مرفق'} 
                          className="w-full max-h-36 object-cover group-hover:scale-105 transition-transform duration-200" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Maximize2 size={16} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <div 
                        key={idx}
                        className="flex items-center gap-2 p-2.5 bg-black/30 border border-white/15 rounded-xl text-xs"
                      >
                        {att.type?.includes('pdf') ? (
                          <FileText size={16} className="text-red-400 flex-shrink-0" />
                        ) : (
                          <FileCode size={16} className="text-blue-400 flex-shrink-0" />
                        )}
                        <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                      </div>
                    )
                  ))}
                </div>
              )}

              {message.content && (
                <div className="prose prose-invert max-w-none text-xs sm:text-sm md:text-base leading-relaxed">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Live Streaming Response Bubble */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2.5 sm:gap-4 flex-row"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md overflow-hidden text-white">
              {logoUrl && !logoError ? (
                <img 
                  src={logoUrl} 
                  alt="AI" 
                  className="w-full h-full object-cover" 
                  onError={() => setLogoError(true)}
                />
              ) : <Bot size={18} />}
            </div>

            <div className="max-w-[94%] sm:max-w-[85%] lg:max-w-[75%] p-3 sm:p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-lg bg-white/5 text-[#F5F5DC] rounded-tr-none border border-white/5 backdrop-blur-sm break-words overflow-x-auto">
              {streamingText ? (
                <div className="prose prose-invert max-w-none text-xs sm:text-sm md:text-base leading-relaxed">
                  <ReactMarkdown>{streamingText}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 py-1 px-1.5">
                  <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} className="w-2 h-2 bg-primary rounded-full" />
                  <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.2 }} className="w-2 h-2 bg-primary rounded-full" />
                  <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.4 }} className="w-2 h-2 bg-primary rounded-full" />
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="p-2.5 sm:p-4 md:p-6 bg-gradient-to-t from-bg-dark via-bg-dark to-transparent flex-shrink-0">
        {/* Limit Warning Card */}
        {limitWarning && (
          <div className="max-w-4xl mx-auto mb-2 sm:mb-3 p-3.5 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/40 rounded-2xl text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2 text-[#F5F5DC]">
              <Crown size={18} className="text-primary flex-shrink-0" />
              <span>{limitWarning}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openPricingModal}
                className="px-3.5 py-1.5 bg-primary text-white rounded-xl font-black text-xs hover:bg-accent shadow-md shadow-primary/20 transition-all flex items-center gap-1"
              >
                <Zap size={13} />
                <span>ترقية الحساب الآن</span>
              </button>
              <button onClick={() => setLimitWarning(null)} className="p-1 hover:text-white text-[#A0A0A0]">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* General Error Banner */}
        {error && (
          <div className="max-w-4xl mx-auto mb-2 sm:mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs sm:text-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="max-w-4xl mx-auto space-y-2">
          {/* Pending Attachments Strip */}
          {attachments.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 px-2 custom-scrollbar">
              {attachments.map((att, idx) => (
                <div 
                  key={idx}
                  className="relative group flex items-center gap-2 p-1.5 pl-3 bg-white/10 border border-white/15 rounded-xl text-xs flex-shrink-0 shadow-md backdrop-blur-md"
                >
                  {att.isImage ? (
                    <img 
                      src={att.data} 
                      alt="Thumbnail" 
                      className="w-9 h-9 rounded-lg object-cover" 
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                      {att.type.includes('pdf') ? <FileText size={18} /> : <FileCode size={18} />}
                    </div>
                  )}

                  <div className="flex flex-col max-w-[120px]">
                    <span className="truncate font-bold text-white text-[11px]">{att.name}</span>
                    <span className="text-[9px] text-[#A0A0A0]">{formatFileSize(att.size)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="p-1 text-[#A0A0A0] hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors ml-1"
                    title="إزالة المرفق"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Controls Bar */}
          <form onSubmit={handleSubmit} className="relative group flex items-center gap-1.5 sm:gap-2">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl md:rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition duration-300 pointer-events-none" />
            
            <div className="relative flex-1 flex items-center bg-white/5 border border-white/10 rounded-2xl md:rounded-[2rem] backdrop-blur-xl focus-within:border-primary/60 transition-all">
              {/* Quick Actions (Camera & File Upload) */}
              <div className="flex items-center gap-0.5 sm:gap-1 pr-2 sm:pr-3">
                {/* Camera Trigger */}
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="p-2 sm:p-2.5 text-[#A0A0A0] hover:text-primary hover:bg-white/5 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                  title="التقاط صورة بالكاميرا"
                  aria-label="Camera"
                >
                  <Camera size={19} />
                </button>

                {/* File Upload Trigger */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 sm:p-2.5 text-[#A0A0A0] hover:text-primary hover:bg-white/5 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                  title="رفع ملف أو صورة"
                  aria-label="Upload File"
                >
                  <Paperclip size={19} />
                </button>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt,.md,.js,.ts,.tsx,.jsx,.py,.html,.css,.json,.csv"
                  className="hidden"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    if (e.target) e.target.value = '';
                  }}
                />
              </div>

              {/* Text Input */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={attachments.length > 0 ? "أضف تعليقاً أو سؤالاً عن المرفق..." : "اسأل Akasha AI أي شيء..."}
                className="w-full bg-transparent py-3 sm:py-4 md:py-4.5 pr-2 pl-12 sm:pl-14 text-[#F5F5DC] focus:outline-none placeholder-[#606060] text-xs sm:text-sm md:text-base"
              />

              {/* Send Action Button */}
              <button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className="absolute left-1.5 sm:left-2 md:left-3 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 md:p-3 bg-primary text-white rounded-xl md:rounded-2xl hover:bg-accent active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary/20 flex items-center justify-center"
                aria-label="Send message"
              >
                <Send size={18} className="rotate-180" />
              </button>
            </div>
          </form>
        </div>

        <div className="text-center mt-3 sm:mt-4 space-y-1">
          <p className="text-[8px] sm:text-[10px] text-[#505050] uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-1.5">
            <Sparkles size={10} className="text-primary" />
            Akasha AI - KAI-1 Multimodal & Streaming Engine
          </p>
          <p className="text-[9px] sm:text-[11px] text-[#606060] font-medium">
            Akasha هو نموذج ذكاء اصطناعي و قد ينتج عنه أخطاء
          </p>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Image Lightbox Full View Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
              <img 
                src={previewImage} 
                alt="Enlarged preview" 
                className="w-full h-full object-contain max-h-[85vh] rounded-2xl shadow-2xl" 
              />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all"
                title="إغلاق"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SuggestionCard = ({ text, onClick }: { text: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="p-3 sm:p-3.5 bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium text-[#A0A0A0] hover:bg-white/10 hover:border-primary/30 hover:text-[#F5F5DC] active:scale-[0.98] transition-all text-right shadow-sm"
  >
    {text}
  </button>
);
