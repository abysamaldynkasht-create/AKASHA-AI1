import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { Settings } from './components/Settings';
import { About } from './components/About';
import { AdminPanel } from './components/AdminPanel';
import { LandingPage } from './components/LandingPage';
import { signInWithGoogle, db } from './lib/firebase';
import { LOGO_URL as DEFAULT_LOGO_URL } from './constants';
import { doc, onSnapshot as onFirestoreSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Sparkles, ShieldCheck, Mail } from 'lucide-react';

const MainApp = () => {
  const { user, loading, isAdmin } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    // Listen for remote config changes
    const unsubscribe = onFirestoreSnapshot(doc(db, 'app_config', 'settings'), (snapshot) => {
      if (snapshot.exists() && snapshot.data().logoUrl) {
        setLogoUrl(snapshot.data().logoUrl);
        setLogoError(false);
      }
    });

    // Listen for local updates from admin panel
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

  if (loading) {
    return (
      <div className="h-screen w-screen bg-bg-dark flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center overflow-hidden"
        >
          {logoUrl && !logoError ? (
            <img 
              src={logoUrl} 
              alt="Loading" 
              className="w-full h-full object-cover" 
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="text-white font-bold text-2xl">AK</span>
          )}
        </motion.div>
      </div>
    );
  }

  if (!user) {
    if (!showLogin) {
      return <LandingPage onStart={() => setShowLogin(true)} />;
    }

    return (
      <div className="h-screen w-screen bg-bg-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full -z-10" />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-primary rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/20 overflow-hidden">
              {logoUrl && !logoError ? (
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-cover" 
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-white font-black text-3xl">AK</span>
              )}
            </div>
            <h1 className="text-4xl font-black text-[#F5F5DC] tracking-tighter">Akasha AI 0.1</h1>
            <p className="text-[#A0A0A0] text-lg font-medium">مرحباً بك مجدداً</p>
          </div>

          <div className="glass p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">تسجيل الدخول</h2>
              <p className="text-sm text-[#606060]">اختر وسيلة الدخول المفضلة لديك</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={signInWithGoogle}
                className="w-full bg-white text-black font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#F5F5DC] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                الدخول عبر Google
              </button>
              
              <button
                disabled
                className="w-full bg-white/5 text-[#A0A0A0] font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 cursor-not-allowed opacity-50"
              >
                <Mail size={20} />
                الدخول عبر البريد (قريباً)
              </button>
            </div>

            <div className="pt-4 flex items-center justify-center gap-2 text-[10px] text-[#606060] uppercase tracking-widest">
              <ShieldCheck size={12} />
              اتصال آمن ومحمي
            </div>
          </div>

          <button 
            onClick={() => setShowLogin(false)}
            className="text-sm text-[#606060] hover:text-[#F5F5DC] transition-colors"
          >
            العودة للرئيسية
          </button>

          <div className="pt-8 flex flex-col gap-2">
            <p className="text-[10px] text-[#404040] uppercase tracking-[0.3em] font-bold">
              تم التطوير بواسطة Akasha الوطني: Akasha AI
            </p>
            <p className="text-[10px] text-[#404040] uppercase tracking-[0.3em]">
              جميع الحقوق محفوظة © Akasha AI 26
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-bg-dark overflow-hidden" dir="rtl">
      <Sidebar
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={() => setActiveSessionId(null)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />
      <main className="flex-1 relative">
        <Chat
          sessionId={activeSessionId}
          onSessionCreated={setActiveSessionId}
        />
        
        <AnimatePresence>
          {isSettingsOpen && (
            <Settings onClose={() => setIsSettingsOpen(false)} />
          )}
          {isAboutOpen && (
            <About onClose={() => setIsAboutOpen(false)} />
          )}
          {isAdminOpen && (
            <AdminPanel onClose={() => setIsAdminOpen(false)} />
          )}
        </AnimatePresence>

        {/* Footer Credit */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none opacity-20 hidden lg:block">
          <p className="text-[8px] text-[#F5F5DC] uppercase tracking-[0.5em] whitespace-nowrap">
            تم التطوير بواسطة Akasha الوطني: Akasha AI جميع الحقوق محفوظة © Akasha AI 26
          </p>
        </div>
      </main>
    </div>
  );
};


export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
