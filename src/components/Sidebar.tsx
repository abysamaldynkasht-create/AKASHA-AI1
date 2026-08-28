import React, { useEffect, useState } from 'react';
import { db, OperationType, handleFirestoreError, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { 
  MessageSquare, Plus, Settings, LogOut, Trash2, X, Info, 
  ShieldCheck, Sparkles, Crown, Zap, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LOGO_URL as DEFAULT_LOGO_URL } from '../constants';

interface SidebarProps {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenAdmin: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeSessionId, 
  onSelectSession, 
  onNewChat, 
  onOpenSettings, 
  onOpenAbout, 
  onOpenAdmin,
  isOpenMobile = false,
  onCloseMobile = () => {}
}) => {
  const { 
    user, 
    profile, 
    isAdmin, 
    isPro, 
    effectivePlan, 
    usageCount, 
    usageLimit, 
    remainingRequests,
    imageCount,
    imageLimit,
    remainingImages,
    openPricingModal 
  } = useAuth();

  const [sessions, setSessions] = useState<any[]>([]);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const [logoError, setLogoError] = useState(false);

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
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'sessions'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(sessionList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/sessions`);
    });

    return () => unsubscribe();
  }, [user]);

  const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'sessions', sessionId));
      if (activeSessionId === sessionId) {
        onNewChat();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/sessions/${sessionId}`);
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  const formatExpiry = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const SidebarContent = (
    <div className="p-3.5 sm:p-4 flex flex-col gap-3 h-full select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-2 py-3 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden flex-shrink-0">
            {logoUrl && !logoError ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-cover" 
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-white font-black text-lg">AK</span>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-black tracking-tight leading-none">Akasha AI</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-primary font-bold tracking-wider uppercase">
                {isPro ? 'KAI-1 PRO' : 'KAI-1 STD'}
              </span>
              {isPro && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Mobile close drawer button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-2 text-[#A0A0A0] hover:text-white rounded-lg hover:bg-white/5 active:scale-95 transition-all"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {/* New Chat Action */}
      <button
        onClick={() => { onNewChat(); onCloseMobile(); }}
        className="flex items-center justify-between w-full min-h-[46px] p-3 sm:p-3.5 rounded-2xl bg-primary text-white hover:bg-accent active:scale-[0.98] transition-all text-sm font-bold shadow-lg shadow-primary/20"
      >
        <div className="flex items-center gap-2.5">
          <Plus size={18} />
          <span>محادثة جديدة</span>
        </div>
        <Sparkles size={16} className="opacity-70" />
      </button>

      {/* Subscription Card & Usage Quota */}
      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {isPro ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30 text-[10px] font-black">
                <Crown size={11} />
                <span>PRO ACTIVE</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-[#A0A0A0] text-[10px] font-bold">
                <span>FREE</span>
              </span>
            )}
            {isPro && profile?.subscription_end && (
              <span className="text-[10px] text-[#707070]">
                حتى {formatExpiry(profile.subscription_end)}
              </span>
            )}
          </div>

          <button
            onClick={() => { openPricingModal(); onCloseMobile(); }}
            className={`text-[11px] font-bold transition-all ${
              isPro 
                ? 'text-[#A0A0A0] hover:text-[#F5F5DC]' 
                : 'text-primary hover:underline flex items-center gap-1'
            }`}
          >
            {isPro ? 'إدارة الخطة' : 'ترقية إلى PRO'}
            {!isPro && <Zap size={11} />}
          </button>
        </div>

        {/* Quota Progress Bars */}
        <div className="space-y-2 pt-0.5">
          {/* Messages Quota */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#A0A0A0]">
              <span>الرسائل اليومية:</span>
              <span className="font-mono font-bold text-[#F5F5DC]">
                {usageCount} / {usageLimit}
              </span>
            </div>
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${
                  usageCount >= usageLimit 
                    ? 'bg-red-500' 
                    : (usageCount / usageLimit) > 0.8 
                    ? 'bg-amber-500' 
                    : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, (usageCount / Math.max(1, usageLimit)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Images Quota */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#A0A0A0]">
              <span>رفع الصور اليومي:</span>
              <span className="font-mono font-bold text-[#F5F5DC]">
                {imageCount} / {imageLimit}
              </span>
            </div>
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${
                  imageCount >= imageLimit 
                    ? 'bg-red-500' 
                    : (imageCount / imageLimit) > 0.8 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (imageCount / Math.max(1, imageLimit)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {!isPro && (
          <button
            onClick={() => { openPricingModal(); onCloseMobile(); }}
            className="w-full py-1.5 px-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all mt-1"
          >
            <Crown size={12} />
            <span>Upgrade to PRO - فتح KAI-1 الكامل</span>
          </button>
        )}
      </div>

      {/* Recent Chats List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 mt-1">
        <p className="text-[10px] font-black text-[#606060] uppercase tracking-widest px-3 mb-1">المحادثات الأخيرة</p>
        
        {sessions.length === 0 ? (
          <div className="text-center py-8 px-4 text-[#606060] text-xs">
            لا توجد محادثات سابقة بعد.
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => { onSelectSession(session.id); onCloseMobile(); }}
              className={`group flex items-center justify-between min-h-[42px] p-2.5 sm:p-3 rounded-xl cursor-pointer transition-all text-xs sm:text-sm active:scale-[0.99] ${
                activeSessionId === session.id 
                  ? 'bg-primary/15 text-primary border border-primary/25 font-bold shadow-sm' 
                  : 'text-[#A0A0A0] hover:bg-white/5 hover:text-[#F5F5DC]'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate max-w-[85%]">
                <MessageSquare size={16} className={`flex-shrink-0 ${activeSessionId === session.id ? 'text-primary' : 'text-[#606060]'}`} />
                <span className="truncate">{session.title || 'محادثة جديدة'}</span>
              </div>
              <button
                onClick={(e) => deleteSession(e, session.id)}
                className="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all flex-shrink-0"
                title="حذف المحادثة"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="mt-auto pt-2 border-t border-white/5 flex flex-col gap-1">
        {isAdmin && (
          <button
            onClick={() => { onOpenAdmin(); onCloseMobile(); }}
            className="flex items-center gap-2.5 w-full min-h-[38px] p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.98] transition-all text-xs sm:text-sm font-bold"
          >
            <ShieldCheck size={17} />
            <span>لوحة الإدارة</span>
          </button>
        )}
        <button
          onClick={() => { onOpenAbout(); onCloseMobile(); }}
          className="flex items-center gap-2.5 w-full min-h-[38px] p-2.5 rounded-xl hover:bg-white/5 active:scale-[0.98] transition-all text-xs sm:text-sm text-[#A0A0A0] hover:text-[#F5F5DC]"
        >
          <Info size={17} />
          <span>حول Akasha AI</span>
        </button>
        <button
          onClick={() => { onOpenSettings(); onCloseMobile(); }}
          className="flex items-center gap-2.5 w-full min-h-[38px] p-2.5 rounded-xl hover:bg-white/5 active:scale-[0.98] transition-all text-xs sm:text-sm text-[#A0A0A0] hover:text-[#F5F5DC]"
        >
          <Settings size={17} />
          <span>الإعدادات</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full min-h-[38px] p-2.5 rounded-xl hover:bg-red-500/10 active:scale-[0.98] transition-all text-xs sm:text-sm text-red-400 hover:text-red-300"
        >
          <LogOut size={17} />
          <span>تسجيل الخروج</span>
        </button>
        
        {/* User profile snippet */}
        <div 
          onClick={() => { openPricingModal(); onCloseMobile(); }}
          className="flex items-center justify-between p-2.5 mt-1 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl border border-white/5 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2.5 truncate">
            <img 
              src={profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.displayName || 'User')}&background=1A1A1A&color=F5F5DC`} 
              className="w-8 h-8 rounded-xl object-cover flex-shrink-0" 
              alt="Profile" 
            />
            <div className="flex flex-col truncate">
              <span className="text-xs sm:text-sm font-bold truncate text-[#F5F5DC]">{profile?.displayName || 'مستخدم Akasha'}</span>
              <span className="text-[10px] text-[#606060] truncate">{profile?.email}</span>
            </div>
          </div>
          
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md flex-shrink-0 ${
            isPro ? 'bg-primary text-white' : 'bg-white/10 text-[#A0A0A0]'
          }`}>
            {isPro ? 'PRO' : 'FREE'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Permanent Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 h-full bg-bg-dark border-l border-white/5 flex-col text-[#F5F5DC] flex-shrink-0">
        {SidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      <AnimatePresence>
        {isOpenMobile && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />

            {/* Slide-In Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="lg:hidden fixed top-0 right-0 bottom-0 z-50 w-[82vw] max-w-xs h-full bg-[#121212] border-l border-white/10 shadow-2xl flex flex-col text-[#F5F5DC]"
            >
              {SidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
