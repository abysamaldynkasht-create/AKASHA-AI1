import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { Settings } from './components/Settings';
import { About } from './components/About';
import { AdminPanel } from './components/AdminPanel';
import { LandingPage } from './components/LandingPage';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, db } from './lib/firebase';
import { LOGO_URL as DEFAULT_LOGO_URL } from './constants';
import { doc, onSnapshot as onFirestoreSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Sparkles, ShieldCheck, Mail, ArrowLeft, Key, UserPlus, Eye, EyeOff, Menu, Plus } from 'lucide-react';

const MainApp = () => {
  const { user, loading, isAdmin } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'options' | 'email-login' | 'email-signup' | 'forgot-password'>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const [logoError, setLogoError] = useState(false);

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    setSuccessMessage(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setLoginError('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore
      } else {
        setLoginError('حدث خطأ أثناء تسجيل الدخول عبر Google.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (loginMethod !== 'forgot-password' && !password) || isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    setSuccessMessage(null);
    try {
      if (loginMethod === 'email-login') {
        await signInWithEmail(email, password);
      } else if (loginMethod === 'email-signup') {
        await signUpWithEmail(email, password);
      } else if (loginMethod === 'forgot-password') {
        await resetPassword(email);
        setSuccessMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
        setTimeout(() => setLoginMethod('email-login'), 3000);
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      if (error.code === 'auth/user-not-found') {
        setLoginError('هذا الحساب غير موجود.');
      } else if (error.code === 'auth/wrong-password') {
        setLoginError('كلمة المرور غير صحيحة.');
      } else if (error.code === 'auth/invalid-credential') {
        setLoginError('البريد الإلكتروني أو كلمة المرور غير صحيحة. تأكد من بياناتك أو حاول إنشاء حساب جديد.');
      } else if (error.code === 'auth/email-already-in-use') {
        if (loginMethod === 'email-signup') {
          setLoginError('هذا البريد الإلكتروني مسجل لدينا بالفعل. هل نسيته؟ يمكنك استخدامه لتسجيل الدخول مباشرة.');
        } else {
          setLoginError('البريد الإلكتروني مستخدم بالفعل بطريقة أخرى.');
        }
      } else if (error.code === 'auth/invalid-email') {
        setLoginError('البريد الإلكتروني غير صالح.');
      } else if (error.code === 'auth/too-many-requests') {
        setLoginError('تم إرسال الكثير من الطلبات. يرجى المحاولة لاحقاً.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError('تسجيل الدخول بالبريد الإلكتروني غير مفعل بعد.');
      } else if (error.code === 'auth/weak-password') {
        setLoginError('كلمة المرور ضعيفة جداً.');
      } else {
        setLoginError('حدث خطأ أثناء المحاولة. يرجى التحقق من البيانات.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

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

  if (!user) {
    if (!showLogin) {
      return <LandingPage onStart={() => setShowLogin(true)} />;
    }

    return (
      <div className="min-h-screen w-screen bg-bg-dark flex flex-col items-center justify-center p-3.5 sm:p-6 md:p-8 relative overflow-y-auto" dir="rtl">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[450px] md:w-[600px] h-[280px] sm:h-[450px] md:h-[600px] bg-primary/10 blur-[80px] sm:blur-[120px] rounded-full -z-10" />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-md w-full text-center space-y-6 sm:space-y-8 my-auto py-6"
        >
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-[1.8rem] sm:rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/20 overflow-hidden">
              {logoUrl && !logoError ? (
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-cover" 
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-white font-black text-2xl sm:text-3xl">AK</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-[#F5F5DC] tracking-tight">Akasha AI</h1>
            <p className="text-[#A0A0A0] text-sm sm:text-base font-medium">مرحباً بك مجدداً</p>
          </div>

          <div className="glass p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl space-y-5 sm:space-y-6">
            <div className="space-y-1 sm:space-y-2">
              <h2 className="text-lg sm:text-xl font-bold">
                {loginMethod === 'options' ? 'تسجيل الدخول' : 
                 loginMethod === 'email-login' ? 'الدخول بالبريد' : 
                 loginMethod === 'email-signup' ? 'إنشاء حساب جديد' : 
                 'استعادة كلمة المرور'}
              </h2>
              <p className="text-xs sm:text-sm text-[#606060]">
                {loginMethod === 'options' ? 'اختر وسيلة الدخول المفضلة لديك' : 
                 loginMethod === 'forgot-password' ? 'أدخل بريدك الإلكتروني لتلقي رابط الاستعادة' :
                 'أدخل بياناتك للمتابعة'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {loginMethod === 'options' ? (
                <motion.div
                  key="options"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-3"
                >
                  {loginError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                      {loginError}
                    </div>
                  )}
                  {successMessage && (
                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-center">
                      {successMessage}
                    </div>
                  )}
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="w-full min-h-[48px] bg-white text-black font-bold py-3.5 px-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#F5F5DC] active:scale-[0.98] transition-all disabled:opacity-50 text-sm sm:text-base shadow-md"
                  >
                    {isLoggingIn ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                    )}
                    <span>{isLoggingIn ? 'جاري التحميل...' : 'الدخول عبر Google'}</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setLoginMethod('email-login');
                      setLoginError(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full min-h-[48px] bg-white/5 text-[#F5F5DC] font-bold py-3.5 px-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 active:scale-[0.98] transition-all text-sm sm:text-base border border-white/5"
                  >
                    <Mail size={18} />
                    <span>الدخول عبر البريد</span>
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="email-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleEmailAuth}
                  className="space-y-4 text-right"
                >
                  <div className="space-y-2">
                    {loginError && (
                      <div className="space-y-2">
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                          {loginError}
                        </div>
                        {(loginError.includes('مسجل') || loginError.includes('already-in-use')) && loginMethod === 'email-signup' && (
                          <button
                            type="button"
                            onClick={() => {
                              setLoginMethod('email-login');
                              setLoginError(null);
                            }}
                            className="w-full text-xs text-primary hover:underline font-bold text-center"
                          >
                            انتقل إلى تسجيل الدخول الآن
                          </button>
                        )}
                        {(loginError.includes('تأكد من بياناتك') || loginError.includes('invalid-credential')) && loginMethod === 'email-login' && (
                          <button
                            type="button"
                            onClick={() => {
                              setLoginMethod('email-signup');
                              setLoginError(null);
                            }}
                            className="w-full text-xs text-primary hover:underline font-bold text-center"
                          >
                            ليس لديك حساب؟ أنشئ واحداً الآن
                          </button>
                        )}
                      </div>
                    )}
                    {successMessage && (
                      <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-center">
                        {successMessage}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="relative group">
                      <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-[#606060] group-focus-within:text-primary transition-colors" size={18} />
                      <input
                        type="email"
                        required
                        placeholder="البريد الإلكتروني"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full min-h-[46px] bg-black/40 border border-white/10 rounded-xl py-3 sm:py-3.5 pr-11 pl-4 text-white focus:outline-none focus:border-primary transition-all text-sm"
                      />
                    </div>
                    {loginMethod !== 'forgot-password' && (
                      <div className="relative group">
                        <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-[#606060] group-focus-within:text-primary transition-colors" size={18} />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="كلمة المرور"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full min-h-[46px] bg-black/40 border border-white/10 rounded-xl py-3 sm:py-3.5 pr-11 pl-11 text-white focus:outline-none focus:border-primary transition-all text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060] hover:text-white transition-colors p-1"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {loginMethod === 'email-login' && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMethod('forgot-password');
                          setLoginError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-xs text-[#808080] hover:text-primary transition-colors font-medium"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full min-h-[48px] bg-primary text-white font-bold py-3.5 px-5 rounded-2xl flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all text-sm sm:text-base disabled:opacity-50 shadow-md"
                  >
                    {isLoggingIn ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      loginMethod === 'email-login' ? 'تسجيل الدخول' : 
                      loginMethod === 'email-signup' ? 'إنشاء حساب' : 
                      'إرسال رابط الاستعادة'
                    )}
                  </button>

                  <div className="flex flex-col gap-2.5 pt-2">
                    {loginMethod !== 'forgot-password' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMethod(loginMethod === 'email-login' ? 'email-signup' : 'email-login');
                          setLoginError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-xs text-[#A0A0A0] hover:text-primary transition-colors flex items-center justify-center gap-1.5 py-1"
                      >
                        {loginMethod === 'email-login' ? (
                          <><UserPlus size={14} /> ليس لديك حساب؟ أنشئ واحداً</>
                        ) : (
                          <><LogIn size={14} /> لديك حساب بالفعل؟ ادخل هنا</>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMethod('email-login');
                          setLoginError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-xs text-[#A0A0A0] hover:text-primary transition-colors flex items-center justify-center gap-1.5 py-1"
                      >
                        <ArrowLeft size={14} className="rotate-180" />
                        العودة لتسجيل الدخول
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod('options');
                        setLoginError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs text-[#606060] hover:text-white transition-colors flex items-center justify-center gap-1 py-1"
                    >
                      <ArrowLeft size={14} className="rotate-180" />
                      العودة لخيارات الدخول
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] text-[#606060] uppercase tracking-widest">
              <ShieldCheck size={12} />
              اتصال آمن ومحمي
            </div>
          </div>

          <button 
            onClick={() => setShowLogin(false)}
            className="text-xs sm:text-sm text-[#606060] hover:text-[#F5F5DC] transition-colors py-2"
          >
            العودة للرئيسية
          </button>
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
