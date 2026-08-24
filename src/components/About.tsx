import React from 'react';
import { X, Info, Code, Cpu, Shield, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface AboutProps {
  onClose: () => void;
}

export const About: React.FC<AboutProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1A1A1A] border border-[#2A2A2A] w-full max-w-2xl max-h-[90vh] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-4 sm:p-6 border-b border-[#2A2A2A] flex items-center justify-between bg-[#0F0F0F] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Info className="text-[#F5F5DC]" size={20} />
            <h2 className="text-lg sm:text-xl font-bold text-[#F5F5DC]">حول Akasha AI 0.1</h2>
          </div>
          <button onClick={onClose} className="text-[#A0A0A0] hover:text-[#F5F5DC] transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 sm:space-y-8 custom-scrollbar text-right" dir="rtl">
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-[#F5F5DC] flex items-center gap-2 justify-end">
              ما هو تطبيق Akasha AI؟
              <Zap size={18} className="text-[#F5F5DC]" />
            </h3>
            <p className="text-[#A0A0A0] leading-relaxed text-sm sm:text-base">
              هو تطبيق دردشة ذكي متطور يعتمد على الذكاء الاصطناعي (Gemini)، يتيح للمستخدمين إجراء المحادثات الذكية، وحفظ تاريخ الدردشة، وإدارة حساباتهم الشخصية. يتميز التطبيق بواجهة مستخدم عصرية، وتدعم اللغة العربية والإنجليزية بشكل كامل.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#F5F5DC] flex items-center gap-2 justify-end">
              كيف قمت بصنعه؟ (مراحل التطوير)
              <Code size={18} className="text-[#F5F5DC]" />
            </h3>
            <div className="space-y-4 text-[#A0A0A0]">
              <p>تم تطوير التطبيق بنظام "Full-Stack Development" لضمان ترابط الشبكة مع قاعدة البيانات والذكاء الاصطناعي:</p>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li><span className="text-[#F5F5DC] font-medium">التخطيط وهيكلة البيانات:</span> بدأت بتصميم "Blueprint" لقاعدة البيانات في Firebase لتنظيم المستخدمين والمحادثات.</li>
                <li><span className="text-[#F5F5DC] font-medium">إعداد البيئة التقنية:</span> استخدام Vite مع React لضمان سرعة التطوير والتشغيل.</li>
                <li><span className="text-[#F5F5DC] font-medium">نظام الهوية:</span> دمج Firebase Auth للسماح بالدخول عبر Google.</li>
                <li><span className="text-[#F5F5DC] font-medium">تصميم الواجهة (UI/UX):</span> استخدام Tailwind CSS لواجهة "مودرن" تدعم الوضع الليلي مع لمسات جمالية.</li>
                <li><span className="text-[#F5F5DC] font-medium">الذكاء الاصطناعي:</span> ربط التطبيق بـ Gemini API لمعالجة النصوص والإجابة على التساؤلات.</li>
                <li><span className="text-[#F5F5DC] font-medium">التحديث المباشر:</span> استخدام Firestore لضمان ظهور الرسائل فوراً في الوقت الحقيقي.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#F5F5DC] flex items-center gap-2 justify-end">
              الأدوات والتقنيات المستعملة
              <Cpu size={18} className="text-[#F5F5DC]" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0F0F0F] p-4 rounded-xl border border-[#2A2A2A]">
                <h4 className="text-[#F5F5DC] font-bold mb-1">React 19 & TypeScript</h4>
                <p className="text-xs text-[#606060]">لبناء واجهة مستخدم قوية ومنظمة.</p>
              </div>
              <div className="bg-[#0F0F0F] p-4 rounded-xl border border-[#2A2A2A]">
                <h4 className="text-[#F5F5DC] font-bold mb-1">Firebase</h4>
                <p className="text-xs text-[#606060]">لإدارة البيانات والمصادقة في الوقت الحقيقي.</p>
              </div>
              <div className="bg-[#0F0F0F] p-4 rounded-xl border border-[#2A2A2A]">
                <h4 className="text-[#F5F5DC] font-bold mb-1">Gemini API</h4>
                <p className="text-xs text-[#606060]">العقل المدبر المسؤول عن الردود الذكية.</p>
              </div>
              <div className="bg-[#0F0F0F] p-4 rounded-xl border border-[#2A2A2A]">
                <h4 className="text-[#F5F5DC] font-bold mb-1">Tailwind CSS 4</h4>
                <p className="text-xs text-[#606060]">لتنسيق الألوان والتخطيط العصري.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#F5F5DC] flex items-center gap-2 justify-end">
              الميزات المتقدمة
              <Shield size={18} className="text-[#F5F5DC]" />
            </h3>
            <p className="text-[#A0A0A0] leading-relaxed">
              يتميز التطبيق بنظام أمان صارم (Firestore Rules) يضمن خصوصية كل مستخدم، مع تصميم متجاوب يعمل بكفاءة على جميع الأجهزة، وإدارة ذكية للحالة تضمن تجربة سلسة وسريعة.
            </p>
          </section>
        </div>

        <div className="p-6 bg-[#0F0F0F] border-t border-[#2A2A2A] text-center">
          <p className="text-[10px] text-[#606060] uppercase tracking-widest">
            Akasha AI 0.1 - تم التطوير بواسطة Akasha
          </p>
        </div>
      </motion.div>
    </div>
  );
};
