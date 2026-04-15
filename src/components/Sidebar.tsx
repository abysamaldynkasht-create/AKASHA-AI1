import React, { useEffect, useState } from 'react';
import { db, OperationType, handleFirestoreError, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { MessageSquare, Plus, Settings, LogOut, Trash2, Menu, X, Info, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LOGO_URL as DEFAULT_LOGO_URL } from '../constants';

interface SidebarProps {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenAdmin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeSessionId, onSelectSession, onNewChat, onOpenSettings, onOpenAbout, onOpenAdmin }) => {
  const { user, profile, isAdmin } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-primary text-white rounded-xl shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <AnimatePresence>
        {(isOpen || window.innerWidth >= 1024) && (
          <motion.div
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            className={`fixed lg:relative z-40 w-72 h-full bg-bg-dark border-l border-white/5 flex flex-col text-[#F5F5DC] transition-all duration-300`}
          >
            <div className="p-4 flex flex-col gap-4 h-full">
              <div className="flex items-center gap-3 px-2 py-6">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
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
                  <h1 className="text-lg font-black tracking-tighter leading-none">Akasha AI</h1>
                  <span className="text-[10px] text-primary font-bold tracking-widest uppercase">Version 0.1</span>
                </div>
              </div>

              <button
                onClick={() => { onNewChat(); setIsOpen(false); }}
                className="flex items-center justify-between w-full p-4 rounded-2xl bg-primary text-white hover:bg-accent transition-all text-sm font-bold shadow-lg shadow-primary/20"
              >
                <div className="flex items-center gap-3">
                  <Plus size={18} />
                  محادثة جديدة
                </div>
                <Sparkles size={16} className="opacity-50" />
              </button>

              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 mt-4">
                <p className="text-[10px] font-black text-[#404040] uppercase tracking-widest px-3 mb-2">المحادثات الأخيرة</p>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => { onSelectSession(session.id); setIsOpen(false); }}
                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all text-sm ${
                      activeSessionId === session.id 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'text-[#A0A0A0] hover:bg-white/5 hover:text-[#F5F5DC]'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <MessageSquare size={16} className={activeSessionId === session.id ? 'text-primary' : 'text-[#404040]'} />
                      <span className="truncate font-medium">{session.title}</span>
                    </div>
                    <button
                      onClick={(e) => deleteSession(e, session.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-1">
                {isAdmin && (
                  <button
                    onClick={onOpenAdmin}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm font-bold mb-1"
                  >
                    <ShieldCheck size={18} />
                    لوحة الإدارة
                  </button>
                )}
                <button
                  onClick={onOpenAbout}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-all text-sm text-[#A0A0A0] hover:text-[#F5F5DC]"
                >
                  <Info size={18} />
                  حول Akasha AI
                </button>
                <button
                  onClick={onOpenSettings}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-all text-sm text-[#A0A0A0] hover:text-[#F5F5DC]"
                >
                  <Settings size={18} />
                  الإعدادات
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-500/10 transition-all text-sm text-red-400 hover:text-red-300"
                >
                  <LogOut size={18} />
                  تسجيل الخروج
                </button>
                
                <div className="flex items-center gap-3 p-3 mt-2 glass-dark rounded-2xl border border-white/5">
                  <img src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} className="w-9 h-9 rounded-xl" alt="Profile" />
                  <div className="flex flex-col truncate">
                    <span className="text-sm font-bold truncate">{profile?.displayName}</span>
                    <span className="text-[10px] text-[#606060] truncate">{profile?.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
