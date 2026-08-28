import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import { DEFAULT_PLANS } from '../lib/subscriptionConfig';
import { SubscriptionPlanId } from '../types';
import { PayPalCheckout } from './PayPalCheckout';
import { 
  X, Check, Sparkles, Zap, Shield, Crown, CreditCard, 
  Calendar, AlertCircle, RefreshCw, ChevronRight, Lock, CheckCircle2
} from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: SubscriptionPlanId;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  initialPlan = 'pro'
}) => {
  const { 
    user, 
    profile, 
    isPro, 
    effectivePlan, 
    usageCount, 
    usageLimit, 
    remainingRequests, 
    imageCount,
    imageLimit,
    remainingImages,
    upgradeSubscription, 
    cancelSubscription 
  } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>(initialPlan);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentMode, setPaymentMode] = useState<'paypal' | 'instant'>('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManageSection, setShowManageSection] = useState(false);

  if (!isOpen) return null;

  const handleUpgradeSuccess = () => {
    setCheckoutSuccess(true);
    setTimeout(() => {
      setCheckoutSuccess(false);
      onClose();
    }, 2200);
  };

  const handleUpgrade = async (planId: SubscriptionPlanId = 'pro') => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = await upgradeSubscription(planId);
      if (result.success) {
        handleUpgradeSuccess();
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء معالجة الدفع');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelAutoRenew = async () => {
    if (!confirm('هل أنت متأكد من رغبتك في إلغاء التجديد التلقائي؟ ستظل ميزات PRO متاحة حتى نهاية الفترة الحالية.')) {
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = await cancelSubscription();
      if (result.success) {
        alert(result.message);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return 'غير محدد';
    try {
      return new Date(isoString).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  const planList = Object.values(DEFAULT_PLANS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md" dir="rtl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="relative w-full max-w-4xl bg-[#121212] border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header Banner */}
        <div className="relative p-5 sm:p-7 border-b border-white/5 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent flex items-start justify-between flex-shrink-0">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-black">
              <Crown size={14} />
              <span>ترقية وتوسيع إمكانيات KAI-1</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#F5F5DC] tracking-tight">
              اختر الخطة المناسبة لإنتاجيتك
            </h2>
            <p className="text-xs sm:text-sm text-[#A0A0A0]">
              افتح القوة الكاملة لنموذج KAI-1 Pro مع استجابات فورية فائقة السرعة وحدود استخدام واسعة.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#A0A0A0] hover:text-white rounded-xl hover:bg-white/5 transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* Active Subscription Status Banner (If PRO) */}
          {isPro && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-emerald-500/10 to-transparent border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-primary text-white text-xs font-black">PRO ACTIVE</span>
                  <span className="text-sm font-bold text-[#F5F5DC]">اشتراكك في خطة المحترفين مفعّل</span>
                </div>
                <div className="text-xs text-[#A0A0A0] flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>تاريخ الانتهاء / التجديد: <strong className="text-[#F5F5DC]">{formatDateTime(profile?.subscription_end)}</strong></span>
                  {profile?.subscription_id && (
                    <span className="text-[11px] text-[#707070]">المعرف: {profile.subscription_id}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowManageSection(!showManageSection)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#F5F5DC] border border-white/10 transition-all"
                >
                  {showManageSection ? 'إخفاء الإدارة' : 'إدارة الاشتراك'}
                </button>
              </div>
            </div>
          )}

          {/* Manage Subscription Drawer */}
          <AnimatePresence>
            {showManageSection && isPro && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3"
              >
                <h4 className="text-xs font-bold text-[#F5F5DC] uppercase tracking-wider">خيارات اشتراك PRO</h4>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#A0A0A0]">
                  <p>
                    {profile?.cancel_at_period_end || profile?.subscription_status === 'cancelled'
                      ? 'تم إيقاف التجديد التلقائي. ستنتهي صلاحية PRO في ' + formatDateTime(profile?.subscription_end)
                      : 'التجديد التلقائي مفعل شهرياً بقيمة $19/شهر.'}
                  </p>

                  {!profile?.cancel_at_period_end && profile?.subscription_status !== 'cancelled' && (
                    <button
                      onClick={handleCancelAutoRenew}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 font-bold transition-all disabled:opacity-50"
                    >
                      إلغاء التجديد التلقائي
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Usage Quota Card */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
            {/* Messages Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold text-[#F5F5DC]">الاستهلاك اليومي للرسائل:</span>
                <span className="font-mono text-primary font-bold">
                  {usageCount} / {usageLimit} طلب
                </span>
              </div>
              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    usageCount >= usageLimit 
                      ? 'bg-red-500' 
                      : (usageCount / usageLimit) > 0.8 
                      ? 'bg-amber-500' 
                      : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(100, (usageCount / Math.max(1, usageLimit)) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#707070]">
                <span>المتبقي اليوم: <strong className="text-[#A0A0A0]">{remainingRequests} رسالة</strong></span>
                <span>تجديد يومي تلقائي</span>
              </div>
            </div>

            {/* Images Upload Progress */}
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold text-[#F5F5DC]">رفع الصور اليومي:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {imageCount} / {imageLimit} صورة
                </span>
              </div>
              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    imageCount >= imageLimit 
                      ? 'bg-red-500' 
                      : (imageCount / imageLimit) > 0.8 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (imageCount / Math.max(1, imageLimit)) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#707070]">
                <span>المتبقي اليوم: <strong className="text-[#A0A0A0]">{remainingImages} صورة</strong></span>
                <span>{isPro ? 'خطة PRO موسعة حتى 200 صورة' : 'الخطة المجانية تتيح 10 صور يومياً'}</span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Overlay */}
          {checkoutSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-center gap-2 font-bold animate-pulse">
              <CheckCircle2 size={20} />
              <span>تم ترقية حسابك إلى PRO بنجاح! جاري التحديث...</span>
            </div>
          )}

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FREE PLAN */}
            <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              effectivePlan === 'free' && !isPro
                ? 'bg-white/[0.04] border-white/20 shadow-lg'
                : 'bg-black/30 border-white/5 opacity-80 hover:opacity-100'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-bold text-[#A0A0A0]">
                    {DEFAULT_PLANS.free.badge_title}
                  </span>
                  <span className="text-2xl font-black text-[#F5F5DC]">$0</span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#F5F5DC]">{DEFAULT_PLANS.free.name_ar}</h3>
                  <p className="text-xs text-[#808080] mt-1">{DEFAULT_PLANS.free.description}</p>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2">
                  <p className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider">ما تتضمنه الخطة:</p>
                  <ul className="space-y-1.5 text-xs text-[#A0A0A0]">
                    {DEFAULT_PLANS.free.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check size={14} className="text-white/60 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 pt-3">
                <button
                  disabled={effectivePlan === 'free' && !isPro}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 text-xs font-bold text-[#A0A0A0] border border-white/5 disabled:opacity-50"
                >
                  {effectivePlan === 'free' && !isPro ? 'الخطة الحالية الافتراضية' : 'الخطة المجانية'}
                </button>
              </div>
            </div>

            {/* PRO PLAN */}
            <div className={`p-5 rounded-2xl border relative flex flex-col justify-between transition-all ${
              isPro
                ? 'bg-primary/10 border-primary/40 shadow-xl'
                : 'bg-gradient-to-b from-primary/15 via-[#181818] to-[#121212] border-primary/40 shadow-2xl hover:border-primary'
            }`}>
              {/* Popular Badge */}
              <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-black tracking-widest uppercase shadow-md flex items-center gap-1">
                <Sparkles size={11} />
                <span>الأكثر شعبية للمحترفين</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-black">
                    {DEFAULT_PLANS.pro.badge_title}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-primary">$19</span>
                    <span className="text-xs text-[#A0A0A0]">/ شهرياً</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#F5F5DC] flex items-center gap-1.5">
                    <span>{DEFAULT_PLANS.pro.name_ar}</span>
                    <Crown size={16} className="text-primary" />
                  </h3>
                  <p className="text-xs text-[#A0A0A0] mt-1">{DEFAULT_PLANS.pro.description}</p>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-2">
                  <p className="text-[11px] font-bold text-primary uppercase tracking-wider">ميزات PRO الحصرية:</p>
                  <ul className="space-y-2 text-xs text-[#F5F5DC]">
                    {DEFAULT_PLANS.pro.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 font-medium">
                        <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={11} />
                        </div>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 pt-3 space-y-3">
                {isPro ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-xl bg-primary/20 text-primary border border-primary/30 text-xs font-black flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    <span>أنت مشترك بالفعل في PRO</span>
                  </button>
                ) : (
                  <>
                    {/* Method Selector Tabs */}
                    <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/5 text-xs">
                      <button
                        onClick={() => setPaymentMode('paypal')}
                        className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                          paymentMode === 'paypal'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-[#A0A0A0] hover:text-white'
                        }`}
                      >
                        <CreditCard size={13} />
                        <span>بوابة PayPal والبطاقات</span>
                      </button>

                      <button
                        onClick={() => setPaymentMode('instant')}
                        className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                          paymentMode === 'instant'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-[#A0A0A0] hover:text-white'
                        }`}
                      >
                        <Zap size={13} />
                        <span>تفعيل سريع فوري</span>
                      </button>
                    </div>

                    {paymentMode === 'paypal' ? (
                      <PayPalCheckout
                        planId="pro"
                        price={19.00}
                        planName="KAI-1 Pro Ultra"
                        onSuccess={handleUpgradeSuccess}
                        onError={(err) => setErrorMessage(err)}
                      />
                    ) : (
                      <button
                        onClick={() => handleUpgrade('pro')}
                        disabled={isProcessing}
                        className="w-full min-h-[46px] py-3 px-5 rounded-xl bg-primary hover:bg-accent text-white text-sm font-black shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Zap size={16} />
                            <span>تفعيل فوري الآن إلى KAI-1 PRO ($19)</span>
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Future Plans Teaser (Scalability: Business & Enterprise) */}
          <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5 text-center sm:text-right">
              <span className="font-bold text-[#A0A0A0]">هل تحتاج خطة مخصصة لفرق العمل أو الشركات الكبرى؟</span>
              <p className="text-[#606060]">تتوفر خطط Business و Enterprise مع خوادم معالجة مخصصة واتفاقية SLA.</p>
            </div>
            <button
              onClick={() => alert('لطلب خطة المؤسسات أو الأعمال، يرجى التواصل مع فريق الدعم على: support@akasha.ai')}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#F5F5DC] border border-white/10 transition-all flex-shrink-0"
            >
              طلب خطة الشركات
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/5 bg-black/40 flex items-center justify-between text-[11px] text-[#606060] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Lock size={12} className="text-emerald-400" />
            <span>دفع آمن 100% مع تشفير من طرف لطرف وضمان استرجاع لمدة 14 يوماً</span>
          </div>
          <span>KAI-1 Subscription Engine</span>
        </div>
      </motion.div>
    </div>
  );
};
