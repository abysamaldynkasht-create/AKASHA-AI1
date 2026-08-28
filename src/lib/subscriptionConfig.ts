import { PlanDefinition, SubscriptionPlanId, UserSubscription } from '../types';

export const DEFAULT_PLANS: Record<SubscriptionPlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    name_ar: 'الخطة المجانية',
    badge_title: 'FREE',
    description: 'الوصول الأساسي لتجربة نموذج KAI-1 واستكشاف قدرات الذكاء الاصطناعي.',
    price: 0,
    currency: '$',
    billing_cycle: 'always_free',
    usage_limit: 20, // 20 messages per day
    image_limit: 10, // 10 image uploads per day
    model_name: 'KAI-1 Standard',
    model_tier: 'standard',
    max_file_size_mb: 5,
    allow_vision_upload: true,
    priority_streaming: false,
    custom_system_prompt: false,
    features: [
      '20 رسالة / يومياً مع تجديد تلقائي كل 24 ساعة',
      'رفع وتحليل حتى 10 صور / يومياً',
      'الوصول إلى نموذج KAI-1 القياسي',
      'تحليل النصوص الأساسي ومعاينة الأكواد',
      'دعم رفع الملفات حتى 5 ميجابايت',
      'حفظ سجل المحادثات والذاكرة الأساسية'
    ],
    excluded_features: [
      'نموذج KAI-1 Pro فائق الذكاء وسرعة الاستجابة',
      'رفع غير محدود للصور والمستندات الكبيرة (خاص بـ PRO)',
      'أولوية معالجة فورية بدون انتظار في أوقات الذروة',
      'تخصيص هوية المساعد ونماذج الذكاء الاصطناعي المتقدمة',
      'دعم فني مباشر ومخصص للمحترفين'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    name_ar: 'خطة المحترفين PRO',
    badge_title: 'PRO',
    description: 'القدرة الكاملة للنموذج الأقوى KAI-1 مع أعلى سرعة وحدود استخدام واسعة.',
    price: 19,
    currency: '$',
    billing_cycle: 'monthly',
    usage_limit: 500, // 500 requests per day
    image_limit: 200, // 200 image uploads per day
    model_name: 'KAI-1 Pro Ultra',
    model_tier: 'pro_ultra',
    max_file_size_mb: 50,
    allow_vision_upload: true,
    priority_streaming: true,
    custom_system_prompt: true,
    is_popular: true,
    features: [
      '500 رسالة / يومياً لإنتاجية لا تتوقف',
      'رفع وتحليل متقدم للصور حتى 200 صورة يومياً بحجم 50MB',
      'الوصول الكامل والافتراضي لنموذج KAI-1 Pro فائق القوة',
      'أولوية قصوى في معالجة الردود والتدفق السريع (Ultra Streaming)',
      'تخصيص كامل للهوية والأوامر النظامية (System Prompt)',
      'ذاكرة طويلة المدى فائقة الاستيعاب',
      'شارة PRO الاحترافية في الحساب'
    ],
    excluded_features: [
      'ميزات إدارة الفرق المتعددة والحسابات المركزية (خاصة بالأعمال)',
      'خوادم مخصصة ذات نطاق ترددي منفصل (Enterprise)'
    ]
  },
  business: {
    id: 'business',
    name: 'Business',
    name_ar: 'خطة فرق العمل Business',
    badge_title: 'BUSINESS',
    description: 'للفرق والمؤسسات التي تحتاج قدرات معالجة جماعية وحصص استخدام ضخمة.',
    price: 49,
    currency: '$',
    billing_cycle: 'monthly',
    usage_limit: 2000,
    image_limit: 1000,
    model_name: 'KAI-1 Business Cluster',
    model_tier: 'dedicated',
    max_file_size_mb: 100,
    allow_vision_upload: true,
    priority_streaming: true,
    custom_system_prompt: true,
    features: [
      '2000 طلب / يومياً',
      'رفع حتى 1000 صورة / يومياً للفريق',
      'نموذج KAI-1 فائق الذكاء مع أولوية قصوى',
      'لوحة تحكم مركزية للفريق ومشاركة الجلسات',
      'تحليل ملفات ضخمة حتى 100MB',
      'دعم فني ذو أولوية 24/7'
    ],
    excluded_features: [
      'خادم مخصص كلياً داخل الشبكة المحلية للشركة'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    name_ar: 'خطة الشركات Enterprise',
    badge_title: 'ENTERPRISE',
    description: 'حلول مخصصة وشاملة للشركات الكبرى مع دعم اتفاقية مستوى الخدمة SLA.',
    price: 199,
    currency: '$',
    billing_cycle: 'custom',
    usage_limit: 10000,
    image_limit: 5000,
    model_name: 'KAI-1 Custom Enterprise',
    model_tier: 'dedicated',
    max_file_size_mb: 500,
    allow_vision_upload: true,
    priority_streaming: true,
    custom_system_prompt: true,
    features: [
      'حدود استخدام غير محدودة مخصصة للشركة',
      'رفع صور ومستندات غير محدودة للشركات',
      'تضمين خوادم ذكاء اصطناعي خاصة وعالية الأمان',
      'تدريب النموذج على بيانات الشركة الخاصة بأمان تام',
      'مدير حساب مخصص واتفاقية مستوى الخدمة (SLA 99.9%)'
    ],
    excluded_features: []
  }
};

/**
 * Checks if the user has an active PRO or higher plan, taking expiration into account.
 */
export function isProActive(subscription?: Partial<UserSubscription> | null): boolean {
  if (!subscription) return false;
  
  const plan = subscription.plan || 'free';
  if (plan === 'free') return false;

  const status = subscription.subscription_status || 'none';
  if (status !== 'active') return false;

  // Check expiration if subscription_end is set
  if (subscription.subscription_end) {
    const endDate = new Date(subscription.subscription_end);
    if (!isNaN(endDate.getTime()) && endDate.getTime() < Date.now()) {
      return false; // Expired
    }
  }

  return true;
}

/**
 * Normalizes user subscription, resetting daily count if it's a new day
 * and downgrading if expired.
 */
export function resolveEffectiveSubscription(sub?: Partial<UserSubscription> | null): {
  effectivePlan: SubscriptionPlanId;
  isActivePro: boolean;
  usageLimit: number;
  usageCount: number;
  remainingRequests: number;
  imageLimit: number;
  imageCount: number;
  remainingImages: number;
  isExpired: boolean;
  status: string;
} {
  const today = new Date().toISOString().split('T')[0];
  const isExpired = !!(sub?.subscription_end && new Date(sub.subscription_end).getTime() < Date.now());
  
  let effectivePlan: SubscriptionPlanId = (sub?.plan as SubscriptionPlanId) || 'free';
  let status = sub?.subscription_status || 'none';

  if (effectivePlan !== 'free' && (isExpired || status === 'expired')) {
    effectivePlan = 'free';
    status = 'expired';
  }

  const planDef = DEFAULT_PLANS[effectivePlan] || DEFAULT_PLANS.free;
  const usageLimit = sub?.usage_limit && sub.usage_limit > 0 ? sub.usage_limit : planDef.usage_limit;
  const imageLimit = sub?.image_limit && sub.image_limit > 0 ? sub.image_limit : planDef.image_limit;
  
  // If the last reset date was before today, effective counts are 0
  const isSameDay = sub?.last_reset_date === today;
  const usageCount = isSameDay ? (sub?.usage_count || 0) : 0;
  const imageCount = isSameDay ? (sub?.image_count || 0) : 0;
  const remainingRequests = Math.max(0, usageLimit - usageCount);
  const remainingImages = Math.max(0, imageLimit - imageCount);

  return {
    effectivePlan,
    isActivePro: effectivePlan !== 'free' && status === 'active' && !isExpired,
    usageLimit,
    usageCount,
    remainingRequests,
    imageLimit,
    imageCount,
    remainingImages,
    isExpired,
    status
  };
}
