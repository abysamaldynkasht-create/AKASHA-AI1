import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { Settings } from './components/Settings';
import { About } from './components/About';
import { AdminPanel } from './components/AdminPanel';
import { SubscriptionModal } from './components/SubscriptionModal';
import { db } from './lib/firebase';
import { LOGO_URL as DEFAULT_LOGO_URL } from './constants';
import { doc, onSnapshot as onFirestoreSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Plus } from 'lucide-react';

const MainApp = () => {
  const { 
    user, 
    loading, 
    isAdmin, 
    isPricingModalOpen, 
    closePricingModal 
  } = useAuth();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
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
      <div className="h-screen w-screen bg-bg-dark flex items-center justify-center p-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-primary rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl"
        >
          {logoUrl && !logoError ? (
            <img 
              src={logoUrl} 
              alt="Loading" 
              className="w-full h-full object-cover" 
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="text-white font-bold text-xl sm:text-2xl">AK</span>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row bg-bg-dark overflow-hidden text-[#F5F5DC]" dir="rtl">
      {/* Mobile Top Navigation Header */}
      <header className="lg:hidden h-14 bg-[#121212] border-b border-white/5 px-3 flex items-center justify-between flex-shrink-0 z-30">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 text-[#A0A0A0] hover:text-white rounded-xl hover:bg-white/5 active:scale-95 transition-all"
          aria-label="Open sidebar"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
            {logoUrl && !logoError ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-cover" 
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-white font-black text-xs">AK</span>
            )}
          </div>
          <span className="font-black text-sm tracking-tight">Akasha AI</span>
        </div>

        <button
          onClick={() => setActiveSessionId(null)}
          className="p-2 text-primary hover:text-accent rounded-xl hover:bg-primary/10 active:scale-95 transition-all flex items-center gap-1 text-xs font-bold"
          title="محادثة جديدة"
        >
          <Plus size={18} />
        </button>
      </header>

      {/* Main Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={() => setActiveSessionId(null)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Chat & Modals Viewport */}
      <main className="flex-1 relative flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen overflow-hidden">
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
          {isPricingModalOpen && (
            <SubscriptionModal 
              isOpen={isPricingModalOpen} 
              onClose={closePricingModal} 
            />
          )}
        </AnimatePresence>
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
