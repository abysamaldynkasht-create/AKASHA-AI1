import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getUserMemory } from '../lib/memoryService';
import { X, User, Save, CheckCircle, Moon, Sun, Mail, HelpCircle, CreditCard, Lock, Shield, Globe, ChevronRight, Brain, Trash2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsProps {
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { user, profile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [memory, setMemory] = useState<string>('');
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);

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

  const handleClearMemory = async () => {
    if (!user || !window.confirm('هل أنت متأكد من مسح جميع الذكريات؟ سيبدأ المساعد من جديد تماماً.')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'config', 'memory'));
      setMemory('');
    } catch (error) {
      console.error("Error clearing memory:", error);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1A1A1A] border border-[#2A2A2A] w-full max-w-lg max-h-[90vh] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-4 sm:p-6 border-b border-[#2A2A2A] flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-[#F5F5DC]">الإعدادات</h2>
          <button onClick={onClose} className="text-[#A0A0A0] hover:text-[#F5F5DC] transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar" dir="rtl">
          {/* Profile Section */}
          <section className="space-y-6">
            <h3 className="text-xs font-bold text-[#606060] uppercase tracking-wider">الملف الشخصي</h3>
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
                <p className="text-[10px] sm:text-xs text-[#606060]">عضو منذ {new Date(profile?.createdAt).toLocaleDateString()}</p>
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
                  تم تحديث الملف الشخصي بنجاح
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
                الذاكرة الذكية
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
                  <p className="text-xs text-[#404040] text-center">لا توجد ذكريات محفوظة حالياً. ابدأ بالتحدث وسيتذكر Akasha تفضيلاتك!</p>
                )}
              </div>
            </div>
          </section>

          {/* App Settings Section */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-[#606060] uppercase tracking-wider">إعدادات التطبيق</h3>
            <div className="grid grid-cols-1 gap-2">
              <SettingsLink icon={<Globe size={18} />} label="اللغة" value="العربية" />
              <SettingsLink icon={<Shield size={18} />} label="الخصوصية والأمان" />
              <SettingsLink icon={<Lock size={18} />} label="رقابة الوالدين" />
              <SettingsLink icon={<CreditCard size={18} />} label="عرض الاشتراكات" />
            </div>
          </section>

          {/* Support & Feedback Section */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-[#606060] uppercase tracking-wider">الدعم والملاحظات</h3>
            <div className="grid grid-cols-1 gap-2">
              <a 
                href="mailto:akashaai249@gmail.com"
                className="flex items-center justify-between p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-primary" />
                  <span className="text-sm font-medium">إرسال ملاحظات</span>
                </div>
                <ChevronRight size={16} className="text-[#404040] group-hover:text-primary transition-all" />
              </a>
              <SettingsLink icon={<HelpCircle size={18} />} label="مساعدة" />
            </div>
          </section>
        </div>

        <div className="p-6 bg-[#0F0F0F] border-t border-[#2A2A2A] text-center flex-shrink-0">
          <p className="text-[10px] text-[#606060] uppercase tracking-widest">
            Akasha AI 0.1 - النسخة 0.1.0
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const SettingsLink = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) => (
  <button className="flex items-center justify-between p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl hover:border-primary/30 transition-all group">
    <div className="flex items-center gap-3">
      <div className="text-primary">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-xs text-[#606060]">{value}</span>}
      <ChevronRight size={16} className="text-[#404040] group-hover:text-primary transition-all" />
    </div>
  </button>
);
