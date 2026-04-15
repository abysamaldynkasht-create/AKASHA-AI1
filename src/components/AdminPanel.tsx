import React, { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { X, Save, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { LOGO_URL } from '../constants';

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [logoUrl, setLogoUrl] = useState(LOGO_URL);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'app_config', 'settings');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setLogoUrl(docSnap.data().logoUrl);
        }
      } catch (error) {
        console.error("Error fetching config:", error);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'app_config', 'settings'), {
        logoUrl: logoUrl,
        updatedAt: new Date().toISOString(),
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Dispatch event to update logo in components immediately
      window.dispatchEvent(new CustomEvent('configUpdated', { detail: { logoUrl } }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'app_config/settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1A1A1A] border border-[#2A2A2A] w-full max-w-md rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="p-4 sm:p-6 border-b border-[#2A2A2A] flex items-center justify-between bg-[#0F0F0F] flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary" size={20} />
            <h2 className="text-lg sm:text-xl font-bold text-[#F5F5DC]">لوحة الإدارة</h2>
          </div>
          <button onClick={onClose} className="text-[#A0A0A0] hover:text-[#F5F5DC] transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6 text-right overflow-y-auto" dir="rtl">
          <div className="space-y-4">
            <label className="text-xs font-bold text-[#606060] uppercase tracking-wider block">رابط شعار التطبيق (Logo URL)</label>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={logoUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = LOGO_URL)} />
              </div>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="أدخل رابط الصورة هنا..."
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl py-3 px-4 text-[#F5F5DC] focus:outline-none focus:border-primary transition-all text-left text-sm"
                dir="ltr"
              />
            </div>
            <p className="text-[10px] text-[#606060]">سيتم تحديث الشعار في جميع أنحاء التطبيق عند الحفظ.</p>
          </div>

          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 flex items-start gap-3">
            <AlertCircle size={18} className="text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              بصفتك المسؤول (akashaai249@gmail.com)، لديك الصلاحية لتعديل إعدادات النظام الأساسية. يرجى التأكد من الروابط قبل الحفظ.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary w-full py-4 rounded-xl"
          >
            {isSaving ? 'جاري الحفظ...' : (
              <>
                <Save size={20} />
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
              تم تحديث الإعدادات بنجاح
            </motion.div>
          )}
        </form>

        <div className="p-6 bg-[#0F0F0F] border-t border-[#2A2A2A] text-center">
          <p className="text-[10px] text-[#606060] uppercase tracking-widest">
            نظام إدارة Akasha AI
          </p>
        </div>
      </motion.div>
    </div>
  );
};

import { ShieldCheck } from 'lucide-react';
