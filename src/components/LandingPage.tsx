import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Zap, Brain, Code, ArrowRight, ShieldCheck, Globe } from 'lucide-react';
import { LOGO_URL as DEFAULT_LOGO_URL } from '../constants';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [logoUrl, setLogoUrl] = React.useState(DEFAULT_LOGO_URL);
  const [logoError, setLogoError] = React.useState(false);

  React.useEffect(() => {
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

  return (
    <div className="min-h-screen bg-bg-dark text-[#F5F5DC] overflow-x-hidden" dir="rtl">
      {/* Top Banner */}
      <div className="bg-primary/20 border-b border-primary/30 py-2 px-3 text-center">
        <p className="text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2">
          <Sparkles size={14} className="text-primary flex-shrink-0" />
          <span>تحديث جديد: Akasha AI 0.1 متاح الآن مع نموذج KAI-1 المتدفق ودعم كامل للغة العربية!</span>
          <Sparkles size={14} className="text-primary flex-shrink-0 hidden sm:inline-block" />
        </p>
      </div>

      {/* Hero Section */}
      <section className="relative pt-10 sm:pt-16 md:pt-24 pb-16 sm:pb-24 md:pb-32 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] sm:w-[500px] md:w-[800px] h-[280px] sm:h-[500px] bg-primary/10 blur-[80px] md:blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-5xl mx-auto text-center space-y-5 sm:space-y-7">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-primary rounded-2xl sm:rounded-[2.2rem] flex items-center justify-center mx-auto shadow-2xl shadow-primary/25 mb-4 sm:mb-6 overflow-hidden flex-shrink-0"
          >
            {logoUrl && !logoError ? (
              <img 
                src={logoUrl} 
                alt="Akasha AI Logo" 
                className="w-full h-full object-cover" 
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-white font-black text-2xl sm:text-4xl">AK</span>
            )}
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-tight"
          >
            Akasha AI <span className="text-primary">0.1</span>
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#A0A0A0] max-w-2xl mx-auto font-medium px-2"
          >
            مساعدك الذكي المتكامل للتعلم، البرمجة، وتوليد الأفكار الإبداعية.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-3 sm:pt-6 max-w-md sm:max-w-none mx-auto"
          >
            <button 
              onClick={onStart} 
              className="btn-primary w-full sm:w-auto min-h-[48px] px-8 sm:px-10 py-3.5 sm:py-4 text-base sm:text-lg active:scale-95 shadow-lg shadow-primary/25"
            >
              <span>ابدأ الآن مجاناً</span>
              <ArrowRight size={20} className="rotate-180" />
            </button>
            <button 
              onClick={onStart}
              className="w-full sm:w-auto min-h-[48px] px-8 sm:px-10 py-3.5 sm:py-4 text-base sm:text-lg font-bold border border-white/10 rounded-2xl hover:bg-white/5 active:scale-95 transition-all"
            >
              تسجيل الدخول
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-20 md:py-28 px-4 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16 space-y-2 sm:space-y-3">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black">لماذا تختار Akasha AI؟</h2>
            <p className="text-xs sm:text-base text-[#A0A0A0]">نحن نجمع بين القوة والسرعة لتوفير أفضل تجربة ذكاء اصطناعي.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            <FeatureCard 
              icon={<Brain className="text-primary" size={22} />}
              title="نموذج KAI-1 الذكي"
              description="يعتمد على نموذج KAI-1 فائق التطور مع دعم الرد المتدفق (Streaming) والإجابات الدقيقة."
            />
            <FeatureCard 
              icon={<Code className="text-primary" size={22} />}
              title="مساعد البرمجة"
              description="اكتب، صحح، وافهم الأكواد البرمجية بلغات متعددة وبسهولة فائقة."
            />
            <FeatureCard 
              icon={<Zap className="text-primary" size={22} />}
              title="سرعة فائقة"
              description="استجابة فورية ومعالجة سريعة للبيانات لضمان عدم إضاعة وقتك."
            />
            <FeatureCard 
              icon={<Globe className="text-primary" size={22} />}
              title="دعم كامل للعربية"
              description="واجهة مصممة خصيصاً لتدعم اللغة العربية (RTL) مع قاموس لجميع لغات العالم."
            />
            <FeatureCard 
              icon={<ShieldCheck className="text-primary" size={22} />}
              title="خصوصية وأمان"
              description="بياناتك ومحادثاتك محمية بأعلى معايير الأمان والخصوصية والتشفير."
            />
            <FeatureCard 
              icon={<Sparkles className="text-primary" size={22} />}
              title="واجهة عصرية متكيفة"
              description="تصميم مريح للعين يتكيف تدريجياً مع كافة مقاسات الهواتف والشاشات الذكية."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 border-t border-white/5 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
            {logoUrl && !logoError ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-cover" 
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-white font-bold text-xs">AK</span>
            )}
          </div>
          <span className="font-bold text-sm sm:text-base">Akasha AI 0.1</span>
        </div>
        <p className="text-[10px] sm:text-xs text-[#606060] uppercase tracking-wider font-bold">
          تم التطوير بواسطة منظومة Akasha AI
        </p>
        <p className="text-[9px] sm:text-[10px] text-[#404040] uppercase tracking-widest">
          جميع الحقوق محفوظة © Akasha AI 2026
        </p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <motion.div
    whileHover={{ y: -3 }}
    className="glass p-5 sm:p-7 rounded-2xl sm:rounded-3xl space-y-2.5 sm:space-y-3.5 hover:border-primary/30 transition-all border border-white/5 shadow-md"
  >
    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
      {icon}
    </div>
    <h3 className="text-base sm:text-lg font-bold">{title}</h3>
    <p className="text-[#A0A0A0] text-xs sm:text-sm leading-relaxed">{description}</p>
  </motion.div>
);
