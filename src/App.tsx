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
import { LogIn, Sparkles, ShieldCheck, Mail, ArrowLeft, Key, UserPlus, Eye, EyeOff } from 'lucide-react';

const MainApp = () => {
  const { user, loading, isAdmin } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
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
        setLoginError('تسجيل الدخول بالبريد الإلكتروني غير مفعل بعد. يرجى مراجعة إدارة النظام.');
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
              <h2 className="text-xl font-bold">
                {loginMethod === 'options' ? 'تسجيل الدخول' : 
                 loginMethod === 'email-login' ? 'الدخول بالبريد' : 
                 loginMethod === 'email-signup' ? 'إنشاء حساب جديد' : 
                 'استعادة كلمة المرور'}
              </h2>
              <p className="text-sm text-[#606060]">
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
                    className="w-full bg-white text-black font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#F5F5DC] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingIn ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                    )}
                    {isLoggingIn ? 'جاري التحميل...' : 'الدخول عبر Google'}
                  </button>
                  
                  <button
                    onClick={() => {
                      setLoginMethod('email-login');
                      setLoginError(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full bg-white/5 text-[#F5F5DC] font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Mail size={20} />
                    الدخول عبر البريد
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="email-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleEmailAuth}
                  className="space-y-4"
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
                            className="w-full text-xs text-primary hover:underline font-bold"
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
                            className="w-full text-xs text-primary hover:underline font-bold"
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

                  <div className="space-y-4">
                    <div className="relative group">
                      <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-[#606060] group-focus-within:text-primary transition-colors" size={18} />
                      <input
                        type="email"
                        required
                        placeholder="البريد الإلكتروني"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pr-12 pl-4 text-white focus:outline-none focus:border-primary transition-all"
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
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pr-12 pl-12 text-white focus:outline-none focus:border-primary transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#606060] hover:text-white transition-colors"
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
                        className="text-[10px] text-[#606060] hover:text-primary transition-colors font-bold uppercase tracking-wider"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-primary text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:brightness-110 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      loginMethod === 'email-login' ? 'تسجيل الدخول' : 
                      loginMethod === 'email-signup' ? 'إنشاء حساب' : 
                      'إرسال رابط الاستعادة'
                    )}
                  </button>

                  <div className="flex flex-col gap-3">
                    {loginMethod !== 'forgot-password' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMethod(loginMethod === 'email-login' ? 'email-signup' : 'email-login');
                          setLoginError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-xs text-[#A0A0A0] hover:text-primary transition-colors flex items-center justify-center gap-2"
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
                        className="text-xs text-[#A0A0A0] hover:text-primary transition-colors flex items-center justify-center gap-2"
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
                      className="text-xs text-[#606060] hover:text-white transition-colors flex items-center justify-center gap-1"
                    >
                      <ArrowLeft size={14} className="rotate-180" />
                      العودة لخيارات الدخول
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

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
