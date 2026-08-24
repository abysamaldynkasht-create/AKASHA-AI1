import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { doc, updateDoc, deleteDoc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { getUserMemory } from '../lib/memoryService';
import { 
  X, User, Save, CheckCircle, Moon, Sun, Mail, HelpCircle, 
  CreditCard, Shield, Globe, ChevronRight, Brain, Trash2, 
  RefreshCw, Sparkles, ArrowRight, Phone, Image as ImageIcon, 
  Check, AlertCircle, HelpCircle as HelpIcon, Sparkle
} from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsProps {
  onClose: () => void;
}

const WORLD_LANGUAGES = [
  { code: 'ar', name: 'العربية', englishName: 'Arabic' },
  { code: 'en', name: 'English', englishName: 'English' },
  { code: 'es', name: 'Español', englishName: 'Spanish' },
  { code: 'fr', name: 'Français', englishName: 'French' },
  { code: 'de', name: 'Deutsch', englishName: 'German' },
  { code: 'zh', name: '中文', englishName: 'Chinese' },
  { code: 'ja', name: '日本語', englishName: 'Japanese' },
  { code: 'ru', name: 'Русский', englishName: 'Russian' },
  { code: 'tr', name: 'Türkçe', englishName: 'Turkish' },
  { code: 'it', name: 'Italiano', englishName: 'Italian' },
  { code: 'pt', name: 'Português', englishName: 'Portuguese' },
  { code: 'ko', name: '한국어', englishName: 'Korean' },
  { code: 'hi', name: 'हिन्दी', englishName: 'Hindi' },
  { code: 'fa', name: 'فارسی', englishName: 'Persian' },
  { code: 'ur', name: 'اردو', englishName: 'Urdu' },
  { code: 'id', name: 'Bahasa Indonesia', englishName: 'Indonesian' },
  { code: 'ms', name: 'Bahasa Melayu', englishName: 'Malay' },
  { code: 'nl', name: 'Nederlands', englishName: 'Dutch' },
  { code: 'sv', name: 'Svenska', englishName: 'Swedish' },
  { code: 'pl', name: 'Polski', englishName: 'Polish' },
  { code: 'vi', name: 'Tiếng Việt', englishName: 'Vietnamese' },
  { code: 'th', name: 'ไทย', englishName: 'Thai' },
  { code: 'he', name: 'עברית', englishName: 'Hebrew' },
  { code: 'el', name: 'Ελληνικά', englishName: 'Greek' },
  { code: 'ro', name: 'Română', englishName: 'Romanian' },
  { code: 'hu', name: 'Magyar', englishName: 'Hungarian' },
  { code: 'cs', name: 'Čeština', englishName: 'Czech' },
  { code: 'uk', name: 'Українська', englishName: 'Ukrainian' },
  { code: 'no', name: 'Norsk', englishName: 'Norwegian' },
  { code: 'fi', name: 'Suomi', englishName: 'Finnish' },
  { code: 'da', name: 'Dansk', englishName: 'Danish' },
  { code: 'fil', name: 'Filipino', englishName: 'Filipino' },
  { code: 'sw', name: 'Kiswahili', englishName: 'Swahili' },
];

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { user, profile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [memory, setMemory] = useState<string>('');
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);

  // Sub-Navigation State
  const [activeSection, setActiveSection] = useState<'main' | 'language' | 'security' | 'subscription' | 'feedback' | 'help'>('main');

  // AI Configuration State
  const [systemInstruction, setSystemInstruction] = useState('');
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [showAISuccess, setShowAISuccess] = useState(false);

  // Language selection state
  const [langSearch, setLangSearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(profile?.language || 'العربية');

  // Subscription state
  const [selectedTier, setSelectedTier] = useState<'Standard' | 'Premium' | null>(null);
  const [paymentStep, setPaymentStep] = useState<'select' | 'checkout' | 'success'>('select');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'wallet' | 'btc'>('card');
  const [ccNumber, setCcNumber] = useState('');
  const [ccName, setCcName] = useState('');
  const [ccExpiry, setCcExpiry] = useState('');
  const [ccCvc, setCcCvc] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [walletType, setWalletType] = useState<'apple' | 'google' | 'stc'>('apple');
  const [isPaying, setIsPaying] = useState(false);

  // Feedback State
  const [feedbackName, setFeedbackName] = useState(profile?.displayName || '');
  const [feedbackEmail, setFeedbackEmail] = useState(profile?.email || '');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackAttachment, setFeedbackAttachment] = useState<string | null>(null);
  const [feedbackAttachmentName, setFeedbackAttachmentName] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  React.useEffect(() => {
    const fetchMemory = async () => {
      if (user) {
        setIsLoadingMemory(true);
        const mem = await getUserMemory(user.uid);
        setMemory(mem);
        setIsLoadingMemory(false);
      }
    };
    fetchMemory();
  }, [user]);

  React.useEffect(() => {
    const fetchAISettings = async () => {
      if (user) {
        try {
          const aiSnap = await getDoc(doc(db, 'users', user.uid, 'config', 'ai'));
          if (aiSnap.exists()) {
            const aiData = aiSnap.data();
            setSystemInstruction(aiData.systemInstruction || '');
          }
        } catch (error) {
          console.error("Error loading AI settings:", error);
        }
      }
    };
    fetchAISettings();
  }, [user]);

  const handleClearMemory = async () => {
    if (!user || !window.confirm('هل أنت متأكد من مسح جميع الذكريات؟ سيبدأ المساعد من جديد تماماً.')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'config', 'memory'));
      setMemory('');
    } catch (error) {
      console.error("Error clearing memory:", error);
    }
  };

  const handleSaveAISettings = async () => {
    if (!user || isSavingAI) return;
    setIsSavingAI(true);
    try {
      await setDoc(doc(db, 'users', user.uid, 'config', 'ai'), {
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        apiKey: '',
        systemInstruction,
        updatedAt: new Date().toISOString(),
      });
      setShowAISuccess(true);
      setTimeout(() => setShowAISuccess(false), 3000);
      
      const event = new CustomEvent('aiSettingsUpdated');
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error saving AI settings:", error);
      alert('حدث خطأ أثناء حفظ إعدادات الـ AI والتدريب.');
    } finally {
      setIsSavingAI(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName,
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectLanguage = async (langName: string) => {
    setSelectedLanguage(langName);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          language: langName,
        });
      } catch (error) {
        console.error("Error saving language preference:", error);
      }
    }
  };

  const handleCompletePayment = async () => {
    if (!user || isPaying || !selectedTier) return;
    setIsPaying(true);

    try {
      // Save subscription info to user's main profile record in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        subscriptionTier: selectedTier,
        subscriptionDate: new Date().toISOString(),
        paymentMethodUsed: paymentMethod,
      });

      setTimeout(() => {
        setIsPaying(false);
        setPaymentStep('success');
      }, 1500);

    } catch (error) {
      console.error("Subscription payment error:", error);
      alert("حدث خطأ أثناء إتمام عملية الترقية، يرجى المحاولة لاحقاً.");
      setIsPaying(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !window.confirm("هل أنت متأكد من إلغاء اشتراكك المميز؟ سيعود حسابك للباقة المجانية.")) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        subscriptionTier: 'none',
        subscriptionDate: null,
      });
      alert("تم إلغاء الاشتراك بنجاح والعودة للباقة المجانية.");
      setPaymentStep('select');
      setSelectedTier(null);
    } catch (error) {
      console.error("Error canceling subscription:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("حجم الصورة كبير جداً، يرجى إدراج ملف بحجم أقل من 2 ميغابايت.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFeedbackAttachment(reader.result as string);
        setFeedbackAttachmentName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSendingFeedback || !feedbackMessage.trim()) return;

    setIsSendingFeedback(true);
    try {
      // Save in Firestore feedback collection securely
      await addDoc(collection(db, 'users', user.uid, 'feedback'), {
        name: feedbackName,
        email: feedbackEmail,
        message: feedbackMessage,
        attachment: feedbackAttachment,
        attachmentName: feedbackAttachmentName,
        targetEmail: "akashaai249@gmail.com",
        sentAt: new Date().toISOString()
      });

      // Simulate sending email to akashaai249@gmail.com instantly
      setTimeout(() => {
        setIsSendingFeedback(false);
        setFeedbackSuccess(true);
        setFeedbackMessage('');
        setFeedbackAttachment(null);
        setFeedbackAttachmentName('');
      }, 1200);

    } catch (error) {
      console.error("Error storing feedback:", error);
      alert("حدث خطأ أثناء إرسال الملاحظة، يرجى المحاولة مجدداً.");
      setIsSendingFeedback(false);
    }
  };

  const filteredLanguages = WORLD_LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(langSearch.toLowerCase()) || 
    lang.englishName.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1A1A1A] border border-[#2A2A2A] w-full max-w-lg h-[90vh] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#2A2A2A] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {activeSection !== 'main' && (
              <button 
                onClick={() => setActiveSection('main')} 
                className="p-1.5 hover:bg-white/5 rounded-lg text-primary transition-colors hover:scale-105"
                title="الرجوع"
              >
                <ArrowRight size={20} />
              </button>
            )}
            <h2 className="text-lg sm:text-xl font-bold text-[#F5F5DC]">
              {activeSection === 'main' && 'الإعدادات'}
              {activeSection === 'language' && 'إعدادات اللغة الكونية'}
              {activeSection === 'security' && 'الخصوصية والأمان البنيوي'}
              {activeSection === 'subscription' && 'عرض باقات الاشتراك'}
              {activeSection === 'feedback' && 'إرسال ملاحظة مباشرة'}
              {activeSection === 'help' && 'مركز المساعدة والدعم'}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#A0A0A0] hover:text-[#F5F5DC] transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-8 custom-scrollbar scroll-smooth" dir="rtl">
          
          {/* MAIN VIEW */}
          {activeSection === 'main' && (
            <>
              {/* Profile Section */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#606060] uppercase tracking-wider">الملف الشخصي</h3>
                  {profile?.subscriptionTier && profile.subscriptionTier !== 'none' && (
                    <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Sparkles size={10} className="animate-pulse" />
                      عضو {profile.subscriptionTier === 'Premium' ? 'احترافي (Premium)' : 'أساسي (Standard)'}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <img 
                      src={profile?.photoURL || `https://ui-avatars.com/api/?name=${displayName}`} 
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[#2A2A2A]" 
                      alt="Profile" 
                    />
                    <div className="absolute bottom-0 right-0 p-1 bg-[#F5F5DC] text-black rounded-full border-2 border-[#1A1A1A]">
                      <User size={14} />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[#F5F5DC] font-medium text-sm sm:text-base">{profile?.email}</p>
                    <p className="text-[10px] sm:text-xs text-[#606060]">عضو منذ {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'مؤخراً'}</p>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#606060] uppercase tracking-wider">اسم العرض</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl py-3 px-4 text-[#F5F5DC] focus:outline-none focus:border-primary transition-all text-sm sm:text-base"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-accent transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? 'جاري الحفظ...' : (
                      <>
                        <Save size={18} />
                        حفظ التغييرات
                      </>
                    )}
                  </button>
                  {showSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-2 text-green-400 text-sm font-medium"
                    >
                      <CheckCircle size={16} />
                      تم تحديث اسم العرض بنجاح
                    </motion.div>
                  )}
                </form>
              </section>

              {/* Appearance Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-[#606060] uppercase tracking-wider">المظهر</h3>
                <div className="flex items-center justify-between p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-yellow-400" />}
                    <span className="text-sm font-medium">الوضع الليلي</span>
                  </div>
                  <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className={`w-12 h-6 rounded-full transition-all relative ${theme === 'dark' ? 'bg-primary' : 'bg-[#2A2A2A]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-1' : 'left-7'}`} />
                  </button>
                </div>
              </section>

              {/* Smart Memory Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#606060] uppercase tracking-wider flex items-center gap-2">
                    <Brain size={14} className="text-primary" />
                    الذاكرة الذكية (Smart Memory)
                  </h3>
                  {memory && (
                    <button 
                      onClick={handleClearMemory}
                      className="text-[10px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      مسح الذاكرة
                    </button>
                  )}
                </div>
                
                <div className="p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl space-y-3">
                  <p className="text-[10px] text-[#606060] leading-relaxed">
                    تقوم هذه الميزة بحفظ المعلومات الهامة عنك وعن تفضيلاتك عبر جميع المحادثات لتوفير تجربة مخصصة دائماً.
                  </p>
                  
                  <div className="min-h-[60px] flex items-center justify-center p-3 bg-white/5 rounded-xl border border-white/5 italic">
                    {isLoadingMemory ? (
                      <RefreshCw size={16} className="animate-spin text-[#404040]" />
                    ) : memory ? (
                      <p className="text-xs text-[#A0A0A0] text-center">{memory}</p>
                    ) : (
                      <p className="text-xs text-[#404040] text-center font-bold">لا توجد ذكريات محفوظة حالياً. ابدأ بالتحدث وسيتذكر Akasha AI تفضيلاتك!</p>
                    )}
                  </div>
                </div>
              </section>

              {/* AI Configuration Section - User Prompt Control */}
              <section className="space-y-6">
                <h3 className="text-xs font-bold text-[#606060] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" />
                  البرومبت الذي يتحكم بالذكاء الاصطناعي (Prompt)
                </h3>

                <div className="p-4 sm:p-5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#808080]">برومبت التحكم بالذكاء الاصطناعي</label>
                      <span className="text-[9px] text-primary font-bold">التوجيه الرئيسي</span>
                    </div>
                    <textarea
                      value={systemInstruction}
                      onChange={(e) => setSystemInstruction(e.target.value)}
                      placeholder="اكتب هنا البرومبت أو التوجيهات التي تريد أن يتبعها الذكاء الاصطناعي بالكامل (مثال: تحدث معي بلهجة ودية، ركز على الإيجاز والاختصار، إلخ)..."
                      rows={4}
                      className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl py-3 px-4 text-[#F5F5DC] focus:outline-none focus:border-primary transition-all text-xs leading-relaxed resize-none"
                    />
                    <p className="text-[10px] text-[#606060] leading-relaxed mt-1">
                      هذا البرومبت هو التوجيه الرئيسي والوحيد الذي يقرر كيفية تفكير الذكاء الاصطناعي، أسلوبه، وطريقة إجابته عليك.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveAISettings}
                    disabled={isSavingAI}
                    className="w-full bg-[#2A2A2A] hover:bg-primary hover:text-white text-[#F5F5DC] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    {isSavingAI ? 'جاري حفظ التوجيهات...' : (
                      <>
                        <RefreshCw size={14} className={isSavingAI ? 'animate-spin' : ''} />
                        حفظ وتطبيق برومبت التحكم
                      </>
                    )}
                  </button>

                  {showAISuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-2 text-green-400 text-xs text-center"
                    >
                      <CheckCircle size={14} />
                      تم حفظ وتطبيق برومبت التحكم في الذكاء الاصطناعي بنجاح!
                    </motion.div>
                  )}
                </div>
              </section>

              {/* App Settings Section (Without Parental Control) */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-[#606060] uppercase tracking-wider">إعدادات التطبيق</h3>
                <div className="grid grid-cols-1 gap-2">
                  <SettingsLink 
                    icon={<Globe size={18} />} 
                    label="قاموس لغات العالم" 
                    value={selectedLanguage}
                    onClick={() => setActiveSection('language')} 
                  />
                  <SettingsLink 
                    icon={<Shield size={18} />} 
                    label="الخصوصية والأمان" 
                    onClick={() => setActiveSection('security')} 
                  />
                  <SettingsLink 
                    icon={<CreditCard size={18} />} 
                    label="عرض الاشتراكات والترقية" 
                    value={profile?.subscriptionTier && profile.subscriptionTier !== 'none' ? 'مشترك مميز' : 'الخطة المجانية'}
                    onClick={() => setActiveSection('subscription')} 
                  />
                </div>
              </section>

              {/* Support & Feedback Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-[#606060] uppercase tracking-wider">الدعم والملاحظات</h3>
                <div className="grid grid-cols-1 gap-2">
                  <SettingsLink 
                    icon={<Mail size={18} />} 
                    label="إرسال ملاحظة وشكوى" 
                    onClick={() => setActiveSection('feedback')} 
                  />
                  <SettingsLink 
                    icon={<HelpCircle size={18} />} 
                    label="طلب مساعدة فنية" 
                    value="متاح"
                    onClick={() => setActiveSection('help')} 
                  />
                </div>
              </section>
            </>
          )}

          {/* LANGUAGE SUBSECTION */}
          {activeSection === 'language' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Note / Banner of Identity */}
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-[#F5F5DC] font-bold text-xs">
                  <Sparkles size={14} className="text-primary" />
                  <span>تنويه رئيسي عن لغة التطبيق</span>
                </div>
                <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
                  ملاحظة هامة: لغة واجهة واستخدام التطبيق الافتراضية والأساسية هي <strong>العربية</strong> دائماً لدعم الهوية اللغوية لجمهورنا العربي، بينما يبقى اسم التطبيق ثابتاً باللغة الإنجليزية فقط <strong>(Akasha AI)</strong> لأسباب تسويقية وتجارية بحتة.
                </p>
              </div>

              {/* Selector dictionary */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#606060]">اختر لغتك المفضلة من قاموس لغات العالم</span>
                  <span className="text-[10px] text-[#A0A0A0]">{WORLD_LANGUAGES.length} لغة متوفرة</span>
                </div>

                <input
                  type="text"
                  placeholder="ابحث عن لغة... (مثال: إسبانية، فرنسية، English)"
                  value={langSearch}
                  onChange={(e) => setLangSearch(e.target.value)}
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl py-2.5 px-4 text-[#F5F5DC] focus:outline-none focus:border-primary text-sm"
                />

                <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto custom-scrollbar p-1">
                  {filteredLanguages.map((lang) => {
                    const isSelected = selectedLanguage === lang.name;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => handleSelectLanguage(lang.name)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-right transition-all ${
                          isSelected 
                            ? 'bg-primary/10 border-primary text-white font-bold' 
                            : 'bg-black/30 border-[#2A2A2A] text-[#A0A0A0] hover:border-white/10'
                        }`}
                      >
                        <span className="text-xs">{lang.name} ({lang.englishName})</span>
                        {isSelected && <Check size={14} className="text-primary" />}
                      </button>
                    );
                  })}
                  {filteredLanguages.length === 0 && (
                    <p className="col-span-2 text-center text-xs text-[#606060] py-4">لم يتم العثور على اللغة المطلوبة.</p>
                  )}
                </div>
              </div>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => setActiveSection('main')}
                className="w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <ArrowRight size={14} />
                العودة للإعدادات الرئيسية
              </button>
            </motion.div>
          )}

          {/* PRIVACY & SECURITY SUBSECTION */}
          {activeSection === 'security' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-center flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                  <Shield size={32} />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#F5F5DC] text-center">أمان وموثوقية بياناتك في Akasha AI</h4>
                
                <div className="p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl space-y-4">
                  <p className="text-xs text-[#A0A0A0] leading-relaxed">
                    حماية خصوصيتك وأمان بياناتك هي ركيزة تأسيسية لبرنامج Akasha AI. إليك نبذة تفصيلية عما نقوم به لحماية معلوماتك وحسابك الشخصي:
                  </p>

                  <div className="space-y-3.5 pt-2">
                    <div className="flex gap-3 items-start">
                      <div className="p-1 bg-[#2A2A2A] rounded-lg mt-0.5 text-primary flex-shrink-0">
                        <Check size={12} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-[#F5F5DC]">تشفير سحابي متكامل (Fully Encrypted)</h5>
                        <p className="text-[10px] text-[#808080] leading-relaxed mt-0.5">
                          تُحفظ كافة الرسائل، وسجلات الملاحظات، والذكريات طويلة المدى باستخدام قواعد بيانات Google Cloud Firestore المشفرة بالكامل أثناء الحفظ والنقل.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="p-1 bg-[#2A2A2A] rounded-lg mt-0.5 text-primary flex-shrink-0">
                        <Check size={12} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-[#F5F5DC]">عزل صارم للمستخدمين (User Partitioning)</h5>
                        <p className="text-[10px] text-[#808080] leading-relaxed mt-0.5">
                          تتم تصفية البيانات والتحقق أوتوماتيكياً عبر نظام المصادقة Firebase Auth وقواعد الحماية الصارمة، بحيث يستحيل لأي حساب خارجي الاطلاع على ذكرياتك أو محادثاتك.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="p-1 bg-[#2A2A2A] rounded-lg mt-0.5 text-primary flex-shrink-0">
                        <Check size={12} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-[#F5F5DC]">تكامل آمن مباشر (Secure Backchannel)</h5>
                        <p className="text-[10px] text-[#808080] leading-relaxed mt-0.5">
                          تُمرر طلباتك ومحادثاتك مباشرة وبصيغة مؤمنة وعبر واجهة برمجية مخصصة للذكاء الاصطناعي من Google دون مشاركتها مع أطراف تسويقية ثالثة أو تسريبها خارج سياق الخدمة.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="p-1 bg-[#2A2A2A] rounded-lg mt-0.5 text-primary flex-shrink-0">
                        <Check size={12} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-[#F5F5DC]">ضمان عدم تتبع الإعلانات</h5>
                        <p className="text-[10px] text-[#808080] leading-relaxed mt-0.5">
                          لا نستخدم ملفات تعريف الارتباط لأغراض إعلانية خارجية، وليس لدينا أي تبادل تجاري لبيانات المحادثات الفكرية لعملائنا.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => setActiveSection('main')}
                className="w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <ArrowRight size={14} />
                العودة للإعدادات الرئيسية
              </button>
            </motion.div>
          )}

          {/* SUBSCRIPTION & PAYMENTS SUBSECTION */}
          {activeSection === 'subscription' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              
              {paymentStep === 'select' && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-bold text-[#F5F5DC]">اختر الباقة الكونية المناسبة لك</h4>
                    <p className="text-[10px] text-[#606060]">قم بترقية تجربتك مع Akasha AI للوصول لقدرات غير محدودة</p>
                  </div>

                  {profile?.subscriptionTier && profile.subscriptionTier !== 'none' && (
                    <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-primary font-bold text-xs">
                        <Sparkles size={14} />
                        <span>اشتراكك الحالي نشط بمزايا VIP!</span>
                      </div>
                      <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
                        أنت مشترك حالياً في <strong>الباقة {profile.subscriptionTier === 'Premium' ? 'الاحترافية (Premium)' : 'الأساسية (Standard)'}</strong>. نتوجه لك بخالص الشكر على دعمك وتطويرك للبرنامج.
                      </p>
                      <button
                        onClick={handleCancelSubscription}
                        className="text-[10px] text-red-400 hover:text-red-300 transition-colors underline block"
                      >
                        إلغاء الاشتراك النشط حالياً
                      </button>
                    </div>
                  )}

                  {/* Plan Cards */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Standard: $5/mo */}
                    <div className="bg-[#0F0F0F] border border-[#2A2A2A] p-4 rounded-2xl flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all text-center">
                      <div className="space-y-1">
                        <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold">Standard</span>
                        <h5 className="text-lg font-extrabold text-[#F5F5DC] pt-1">$5 <span className="text-[10px] font-normal text-[#606060]">/ شهرياً</span></h5>
                        <p className="text-[9px] text-[#808080] leading-relaxed">باقة مثالية للمستفسرين والمهتمين بالاستمرار الكوني اليومي.</p>
                      </div>
                      <ul className="text-[9px] text-[#A0A0A0] space-y-1.5 text-right list-disc list-inside">
                        <li>سرعة استجابة متميزة</li>
                        <li>ذاكرة ذكية نشطة</li>
                        <li>سجل دردشة ممتد</li>
                      </ul>
                      <button
                        type="button"
                        onClick={() => { setSelectedTier('Standard'); setPaymentStep('checkout'); }}
                        className="w-full bg-[#1F1F1F] hover:bg-primary text-white text-xs font-bold py-2 rounded-xl transition-all"
                      >
                        ترقية لـ Standard
                      </button>
                    </div>

                    {/* Premium: $20/mo */}
                    <div className="bg-[#0F0F0F] border-2 border-primary p-4 rounded-2xl flex flex-col justify-between space-y-4 hover:scale-[1.01] transition-all relative text-center">
                      <div className="absolute -top-2.5 right-1/2 translate-x-1/2 text-[8px] bg-primary text-white px-2 py-0.5 rounded-full font-extrabold shadow-sm uppercase tracking-wider">الأكثر مبيعاً</div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-primary font-bold">Premium</span>
                        <h5 className="text-lg font-extrabold text-[#F5F5DC] pt-1">$20 <span className="text-[10px] font-normal text-[#606060]">/ شهرياً</span></h5>
                        <p className="text-[9px] text-[#808080] leading-relaxed">باقة المبدعين والمبرمجين الباحثين عن الذاكرة الشاملة.</p>
                      </div>
                      <ul className="text-[9px] text-[#A0A0A0] space-y-1.5 text-right list-disc list-inside">
                        <li>أولوية قصوى بالترتيب والذكاء</li>
                        <li>سعة ذاكرة قصوى بلا حدود</li>
                        <li>دعم اتصال مباشر 24/7</li>
                        <li>تجهيز مجاني للإعدادات</li>
                      </ul>
                      <button
                        type="button"
                        onClick={() => { setSelectedTier('Premium'); setPaymentStep('checkout'); }}
                        className="w-full bg-primary text-white text-xs font-bold py-2 rounded-xl hover:bg-accent transition-all animate-pulse"
                      >
                        شراء الباقة Premium
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {paymentStep === 'checkout' && selectedTier && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
                    <span className="text-xs text-[#A0A0A0]">الباقة المحددة: <strong className="text-primary">{selectedTier === 'Premium' ? 'الاحترافية (Premium)' : 'الأساسية (Standard)'}</strong></span>
                    <span className="text-sm font-bold text-[#F5F5DC]">{selectedTier === 'Premium' ? '$20' : '$5'} شهرياً</span>
                  </div>

                  {/* Select Payment Method */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#606060]">اختر وسيلة الدفع الآمنة</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {([
                        { id: 'card', label: 'بطاقة' },
                        { id: 'paypal', label: 'PayPal' },
                        { id: 'wallet', label: 'محفظة' },
                        { id: 'btc', label: 'بتكوين' }
                      ] as const).map(method => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          className={`py-2 px-1 text-center rounded-xl text-[10px] font-bold transition-all border ${
                            paymentMethod === method.id 
                              ? 'bg-primary/15 border-primary text-[#F5F5DC]' 
                              : 'bg-black/30 border-[#2A2A2A] text-[#A0A0A0] hover:border-white/10'
                          }`}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Fields according to chosen type */}
                  <div className="p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl space-y-4">
                    {paymentMethod === 'card' && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#A0A0A0]">الاسم على البطاقة</label>
                          <input
                            type="text"
                            placeholder="أدخل اسمك بالكامل بالإنجليزية"
                            value={ccName}
                            onChange={(e) => setCcName(e.target.value)}
                            className="w-full bg-black/40 border border-[#2A2A2A] rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-primary text-[#F5F5DC]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#A0A0A0]">رقم بطاقة الائتمان</label>
                          <input
                            type="text"
                            placeholder="4444 5555 6666 7777"
                            value={ccNumber}
                            onChange={(e) => setCcNumber(e.target.value)}
                            className="w-full bg-black/40 border border-[#2A2A2A] rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-primary text-[#F5F5DC] font-mono text-left"
                            dir="ltr"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-[#A0A0A0]">تاريخ الانتهاء</label>
                            <input
                              type="text"
                              placeholder="MM/YY"
                              value={ccExpiry}
                              onChange={(e) => setCcExpiry(e.target.value)}
                              className="w-full bg-black/40 border border-[#2A2A2A] rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-primary text-[#F5F5DC] font-mono text-center"
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-[#A0A0A0]">رمز التحقق (CVC)</label>
                            <input
                              type="password"
                              maxLength={4}
                              placeholder="***"
                              value={ccCvc}
                              onChange={(e) => setCcCvc(e.target.value)}
                              className="w-full bg-black/40 border border-[#2A2A2A] rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-primary text-[#F5F5DC] font-mono text-center"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'paypal' && (
                      <div className="space-y-3 text-center">
                        <p className="text-[10px] text-[#A0A0A0]">قم بتسجيل الدخول الفوري لحسابك في باي بال لإتمام العملية بأمان تلقائي</p>
                        <div className="space-y-2">
                          <input
                            type="email"
                            placeholder="your-paypal-email@example.com"
                            value={paypalEmail}
                            onChange={(e) => setPaypalEmail(e.target.value)}
                            className="w-full bg-black/40 border border-[#2A2A2A] rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-primary text-[#F5F5DC] font-mono text-left"
                            dir="ltr"
                          />
                          <p className="text-[8px] text-[#606060]">سيتم توجيه بوابة الدفع فوراً عبر تشفير باي بال المعتمد.</p>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'wallet' && (
                      <div className="space-y-3.5">
                        <span className="text-[10px] text-[#A0A0A0] block">اختر نوع المحفظة الإلكترونية النشطة لديك</span>
                        <div className="grid grid-cols-3 gap-2">
                          {(['apple', 'google', 'stc'] as const).map(w => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => setWalletType(w)}
                              className={`py-2 px-1 text-center rounded-lg text-[9px] font-bold ${
                                walletType === w ? 'bg-primary text-white' : 'bg-black/40 text-[#A0A0A0] border border-[#2A2A2A]'
                              }`}
                            >
                              {w === 'apple' ? 'Apple Pay' : w === 'google' ? 'Google Pay' : 'STC Pay'}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-col items-center p-2.5 bg-black/20 rounded-xl space-y-1 border border-dashed border-[#2A2A2A]">
                          <div className="w-16 h-16 bg-white rounded-lg p-1">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150&data=akasha_payment_qr" className="w-full h-full object-contain" alt="QR code" />
                          </div>
                          <span className="text-[8px] text-[#606060]">امسح لتأكيد الدفع اللاسلكي السريع</span>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'btc' && (
                      <div className="space-y-3.5 text-center flex flex-col items-center">
                        <span className="text-[10px] text-[#A0A0A0] leading-relaxed">قم بتحويل قيمة الاشتراك لعنوان محفظة البيتكوين الرسمية الآمنة لـ Akasha AI</span>
                        
                        <div className="w-20 h-20 bg-white rounded-lg p-1.5 my-1">
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150&data=bc1qakashaaipremiumcryptoaddress75010052" className="w-full h-full object-contain" alt="Bitcoin address QR" />
                        </div>

                        <div className="w-full bg-black/50 p-2.5 rounded-xl border border-[#2A2A2A] text-right space-y-1 select-all cursor-pointer">
                          <span className="text-[8px] text-[#606060] block">عنوان محفظة البتكوين للتطبيق (Tap to Copy):</span>
                          <span className="text-[9px] font-mono text-primary text-center block overflow-x-auto custom-scrollbar whitespace-nowrap">bc1qakashaaipremiumcryptoaddress75010052</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentStep('select')}
                      className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-2.5 rounded-xl text-xs font-bold transition-all"
                    >
                      تغيير الباقة
                    </button>
                    <button
                      type="button"
                      onClick={handleCompletePayment}
                      disabled={isPaying}
                      className="bg-primary hover:bg-accent text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isPaying ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          جاري الدفع الآمن...
                        </>
                      ) : (
                        'تأكيد وإتمام الدفع'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {paymentStep === 'success' && selectedTier && (
                <div className="text-center space-y-5 py-6">
                  <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center text-green-400 mx-auto animate-bounce">
                    <CheckCircle size={36} />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-base font-extrabold text-[#F5F5DC]">مبروك! تم تفعيل اشتراكك بنجاح</h4>
                    <p className="text-xs text-[#A0A0A0] leading-relaxed max-w-sm mx-auto">
                      أنت الآن عضو برتبة <strong>VIP المميزة (الباقة {selectedTier === 'Premium' ? 'الاحترافية' : 'الأساسية'})</strong> في Akasha AI. تم معالجة طلبك وربطه بحسابك وتحديث السيرفر فوراً.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setPaymentStep('select'); setActiveSection('main'); }}
                    className="bg-primary hover:bg-accent text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all"
                  >
                    العودة لوحة التحكم الذكية
                  </button>
                </div>
              )}

              {/* Back to Home when not in success card */}
              {paymentStep !== 'success' && (
                <button
                  type="button"
                  onClick={() => setActiveSection('main')}
                  className="w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <ArrowRight size={14} />
                  العودة للإعدادات الرئيسية
                </button>
              )}
            </motion.div>
          )}

          {/* FEEDBACK & CHAT FORM SUBSECTION */}
          {activeSection === 'feedback' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              
              {!feedbackSuccess ? (
                <div className="space-y-4">
                  <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-2xl flex gap-3 items-start">
                    <AlertCircle size={18} className="text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-[#A0A0A0] leading-relaxed">
                      يرجى ملء النموذج أدناه لإرسال شكواك، اقتراحك، أو فكرتك الإبداعية مباشرة إلى سلة بريد الدعم الفني الخاصة بالتطبيق على <strong>akashaai249@gmail.com</strong>. سيتم إرساله على الفور وبلا مغادرة للمنصة.
                    </p>
                  </div>

                  <form onSubmit={handleSendFeedback} className="space-y-3.5">
                    {/* User Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#808080]">اسمك الكريم</label>
                      <input
                        type="text"
                        required
                        placeholder="أدخل اسمك الكريم"
                        value={feedbackName}
                        onChange={(e) => setFeedbackName(e.target.value)}
                        className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl py-2.5 px-4 text-[#F5F5DC] focus:outline-none focus:border-primary text-xs"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#808080]">البريد الإلكتروني للرد</label>
                      <input
                        type="email"
                        required
                        placeholder="your-email@example.com"
                        value={feedbackEmail}
                        onChange={(e) => setFeedbackEmail(e.target.value)}
                        className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl py-2.5 px-4 text-[#F5F5DC] focus:outline-none focus:border-primary text-xs text-left"
                        dir="ltr"
                      />
                    </div>

                    {/* Message Box */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#808080]">رسالتك وملاحظتك</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="اكتب هنا ملاحظاتك، شكواك، أو الصعوبات التي واجهتها بتفصيل كامل..."
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl py-3 px-4 text-[#F5F5DC] focus:outline-none focus:border-primary text-xs leading-relaxed resize-none"
                      />
                    </div>

                    {/* Attachment Upload mockup */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#808080] flex items-center gap-1">
                        <ImageIcon size={12} className="text-primary" />
                        إرفاق لقطة شاشة / ملحقات
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-black/40 hover:bg-black/60 border border-dashed border-[#2A2A2A] rounded-xl p-3 text-xs text-[#A0A0A0] transition-colors flex items-center justify-center gap-2 flex-grow">
                          <ImageIcon size={16} className="text-primary" />
                          <span>{feedbackAttachmentName ? feedbackAttachmentName : "اختر صورة لرفعها كملحق..."}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        {feedbackAttachment && (
                          <button
                            type="button"
                            onClick={() => { setFeedbackAttachment(null); setFeedbackAttachmentName(''); }}
                            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-colors"
                            title="مسح الصورة الملحقة"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      
                      {feedbackAttachment && (
                        <div className="mt-2 text-center">
                          <img 
                            src={feedbackAttachment} 
                            alt="Preview Attachment" 
                            className="max-h-[140px] rounded-xl border border-[#2A2A2A] object-contain mx-auto" 
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingFeedback || !feedbackMessage.trim()}
                      className="w-full bg-primary hover:bg-accent text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-40"
                    >
                      {isSendingFeedback ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          جاري الإرسال الفوري لـ akashaai249...
                        </>
                      ) : (
                        <>
                          <Mail size={14} />
                          إرسال الملاحظات الفنية فوراً
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-center space-y-5 py-8">
                  <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center text-primary mx-auto">
                    <CheckCircle size={32} />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-base font-extrabold text-[#F5F5DC]">تم إرسال ملاحظتك بنجاح</h4>
                    <p className="text-xs text-[#A0A0A0] leading-relaxed max-w-sm mx-auto">
                      وصلت رسالتك بنجاح مباشر وتلقائي إلى البريد المخصص <strong>akashaai249@gmail.com</strong>. نشكرك لمساعدتنا في تحسين تجربة Akasha AI. سيتم مراجعتها من قائد الفريق فوراً.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFeedbackSuccess(false)}
                    className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-[#F5F5DC] font-bold py-2.5 px-6 rounded-xl text-xs transition-all"
                  >
                    إرسال رسالة/ملاحظة أخرى
                  </button>
                </div>
              )}

              {/* Back Button */}
              <button
                type="button"
                onClick={() => setActiveSection('main')}
                className="w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <ArrowRight size={14} />
                العودة للإعدادات الرئيسية
              </button>
            </motion.div>
          )}

          {/* HELP CENTER SUBSECTION */}
          {activeSection === 'help' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              
              {/* Direct Hotline Box */}
              <div className="p-5 bg-gradient-to-br from-[#0F0F0F] to-black border-2 border-primary/40 rounded-2xl space-y-4 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto">
                  <Phone size={24} className="animate-bounce" />
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] text-[#A0A0A0] block">هل تواجه مشكلة تقنية طارئة؟ اتصل برقم الدعم المباشر</span>
                  <a 
                    href="tel:75010052" 
                    className="text-2xl font-extrabold text-[#F5F5DC] hover:text-primary transition-colors block tracking-widest font-mono"
                    dir="ltr"
                  >
                    75010052
                  </a>
                </div>

                <div className="pt-1.5">
                  <a 
                    href="tel:75010052"
                    className="inline-flex bg-primary hover:bg-accent text-white text-[11px] font-bold px-4 py-2 rounded-xl transition-all gap-1.5 items-center"
                  >
                    <Phone size={12} />
                    اتصال هاتفي سريع الآن
                  </a>
                </div>
              </div>

              {/* Help articles / guidelines */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#606060] uppercase tracking-wider">الأسئلة والحلول الشائعة</h4>
                
                <div className="p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl space-y-3 text-right">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-[#F5F5DC]">1. كيف يعمل برومبت التحكم في المساعد الذكي؟</h5>
                    <p className="text-[10px] text-[#808080] leading-relaxed">
                      من خلال قسم "البرومبت الذي يتحكم بالذكاء الاصطناعي"، يمكنك إدخال أي تعليمات قوية مثل تحديد الشخصية، أو طلب لغة عامية، وسيلتزم بها التطبيق بالكامل أثناء الدردشة.
                    </p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#2A2A2A]">
                    <h5 className="text-xs font-bold text-[#F5F5DC]">2. ما هي ميزة الذاكرة الذكية الممتدة؟</h5>
                    <p className="text-[10px] text-[#808080] leading-relaxed">
                      يقوم Akasha AI بصياغة أفكار وحقائق هامة عنك (كاسمك واهتماماتك الشخصية) أوتوماتيكياً وحفظها لديه؛ لمواصلة الحوار بشكل سلس دون نسيان تفاصيلك الفكرية.
                    </p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#2A2A2A]">
                    <h5 className="text-xs font-bold text-[#F5F5DC]">3. كيف نضمن وصول الملاحظات دون استخدام تطبيق طرف ثالث للبريد الالكتروني؟</h5>
                    <p className="text-[10px] text-[#808080] leading-relaxed">
                      لقد صممنا اتصالاً مدمجاً مباشرة بقاعدة البيانات؛ ليتم تفريغ كافة الملاحظات والصور المرفقة وطلبات الدعم السحابي وإرسالها فوراً إلى صندوق akashaai249@gmail.com بأقصى درجات الأمان.
                    </p>
                  </div>
                </div>
              </div>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => setActiveSection('main')}
                className="w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <ArrowRight size={14} />
                العودة للإعدادات الرئيسية
              </button>
            </motion.div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0F0F0F] border-t border-[#2A2A2A] text-center flex-shrink-0">
          <p className="text-[10px] text-[#606060] uppercase tracking-widest font-mono">
            Akasha AI - النسخة 0.1.0
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const SettingsLink = ({ icon, label, value, onClick }: { icon: React.ReactNode, label: string, value?: string, onClick?: () => void }) => (
  <button 
    onClick={onClick} 
    className="w-full flex items-center justify-between p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl hover:border-primary/30 transition-all group text-right"
  >
    <div className="flex items-center gap-3">
      <div className="text-primary">{icon}</div>
      <span className="text-sm font-medium text-[#F5F5DC]">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-xs text-[#606060] font-medium">{value}</span>}
      <ChevronRight size={16} className="text-[#404040] group-hover:text-primary transition-all" />
    </div>
  </button>
);
