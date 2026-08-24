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
      {/* Banner */}
      <div className="bg-primary/20 border-b border-primary/30 py-2 px-4 text-center">
        <p className="text-xs lg:text-sm font-medium flex items-center justify-center gap-2">
          <Sparkles size={14} className="text-primary" />
          تحديث جديد: Akasha AI 0.1 متاح الآن مع دعم كامل للغة العربية!
          <Sparkles size={14} className="text-primary" />
        </p>
      </div>

      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 pb-20 md:pb-32 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] md:w-[1000px] h-[300px] sm:h-[600px] bg-primary/10 blur-[80px] md:blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-6xl mx-auto text-center space-y-6 md:y-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 md:w-24 md:h-24 bg-primary rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-primary/20 mb-6 md:mb-8 overflow-hidden"
          >
            {logoUrl && !logoError ? (
              <img 
                src={logoUrl} 
                alt="Akasha AI Logo" 
                className="w-full h-full object-cover" 
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-white font-black text-4xl">AK</span>
            )}
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl sm:text-6xl lg:text-8xl font-black tracking-tighter leading-tight"
          >
            Akasha AI <span className="text-primary">0.1</span>
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg sm:text-xl lg:text-2xl text-[#A0A0A0] max-w-2xl mx-auto font-medium px-4"
          >
            مساعدك الذكي المتكامل للتعلم، البرمجة، وتوليد الأفكار الإبداعية.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 md:pt-8"
          >
            <button onClick={onStart} className="btn-primary w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 text-base md:text-lg">
              ابدأ الآن مجاناً
              <ArrowRight size={20} className="rotate-180" />
            </button>
            <button className="w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 text-base md:text-lg font-bold border border-white/10 rounded-2xl hover:bg-white/5 transition-all">
              اكتشف المميزات
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-32 px-4 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black">لماذا تختار Akasha AI؟</h2>
            <p className="text-sm md:text-base text-[#A0A0A0]">نحن نجمع بين القوة والبساطة لتوفير أفضل تجربة ذكاء اصطناعي.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <FeatureCard 
              icon={<Brain className="text-primary" />}
              title="ذكاء متطور"
              description="يعتمد على أحدث نماذج Gemini لتقديم إجابات دقيقة وذكية في كافة المجالات."
            />
            <FeatureCard 
              icon={<Code className="text-primary" />}
              title="مساعد البرمجة"
              description="اكتب، صحح، وافهم الأكواد البرمجية بلغات متعددة وبسهولة فائقة."
            />
            <FeatureCard 
              icon={<Zap className="text-primary" />}
              title="سرعة فائقة"
              description="استجابة فورية ومعالجة سريعة للبيانات لضمان عدم إضاعة وقتك."
            />
            <FeatureCard 
              icon={<Globe className="text-primary" />}
              title="دعم كامل للعربية"
              description="واجهة مصممة خصيصاً لتدعم اللغة العربية (RTL) بشكل طبيعي وسلس."
            />
            <FeatureCard 
              icon={<ShieldCheck className="text-primary" />}
              title="خصوصية وأمان"
              description="بياناتك ومحادثاتك محمية بأعلى معايير الأمان والخصوصية."
            />
            <FeatureCard 
              icon={<Sparkles className="text-primary" />}
              title="واجهة عصرية"
              description="تصميم مريح للعين يعتمد على الوضع الليلي والجماليات الحديثة."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/5 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
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
          <span className="font-bold">Akasha AI 0.1</span>
        </div>
        <p className="text-[10px] text-[#404040] uppercase tracking-[0.3em] font-bold">
          تم التطوير بواسطة Akasha الوطني: Akasha AI
        </p>
        <p className="text-[10px] text-[#404040] uppercase tracking-[0.3em]">
          جميع الحقوق محفوظة © Akasha AI 26
        </p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="glass p-8 rounded-[2.5rem] space-y-4 hover:border-primary/30 transition-all"
  >
    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
      {icon}
    </div>
    <h3 className="text-xl font-bold">{title}</h3>
    <p className="text-[#A0A0A0] text-sm leading-relaxed">{description}</p>
  </motion.div>
);
