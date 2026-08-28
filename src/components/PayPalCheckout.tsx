import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { Lock, ShieldCheck, CreditCard, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PayPalCheckoutProps {
  planId?: string;
  price?: number;
  planName?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  onError?: (err: string) => void;
}

export const PayPalCheckout: React.FC<PayPalCheckoutProps> = ({
  planId = 'pro',
  price = 19.00,
  planName = 'KAI-1 Pro Ultra',
  onSuccess,
  onCancel,
  onError,
}) => {
  const { user, profile } = useAuth();
  const [clientId, setClientId] = useState<string>('sb'); // Default sandbox/test client ID
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch PayPal client configuration from server
    fetch('/api/payment/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.paypalClientId && data.paypalClientId !== 'test') {
          setClientId(data.paypalClientId);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch PayPal config from server:', err);
      })
      .finally(() => {
        setIsLoadingConfig(false);
      });
  }, []);

  const handleCreateOrder = (data: any, actions: any) => {
    return actions.order.create({
      purchase_units: [
        {
          description: `اشتراك ${planName} - منصة KAI-1 الذكية`,
          amount: {
            currency_code: 'USD',
            value: price.toFixed(2),
          },
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
      },
    });
  };

  const handleApprove = async (data: any, actions: any) => {
    setIsProcessing(true);
    try {
      let details: any = null;
      if (actions?.order?.capture) {
        details = await actions.order.capture();
      }

      // Verify and record with backend
      const res = await fetch('/api/payment/verify-paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid || 'anonymous',
          orderId: data.orderID,
          planId,
          details,
        }),
      });

      const result = await res.json();

      // Update Firestore user document if logged in
      if (user && db) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const now = new Date();
          const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          await updateDoc(userRef, {
            subscription_plan: planId,
            subscription_status: 'active',
            subscription_id: `paypal_${data.orderID || Date.now()}`,
            subscription_start: now.toISOString(),
            subscription_end: endDate.toISOString(),
            usage_limit: 500,
            image_limit: 200,
            cancel_at_period_end: false,
          });
        } catch (dbErr) {
          console.warn('Firestore update sync warning:', dbErr);
        }
      }

      if (result.success) {
        onSuccess();
      } else {
        throw new Error(result.error || 'فشل التحقق من الدفع');
      }
    } catch (err: any) {
      console.error('PayPal onApprove error:', err);
      const msg = err.message || 'حدث خطأ أثناء معالجة عملية الدفع في PayPal';
      setSdkError(msg);
      onError?.(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-primary/20 space-y-4 text-right" dir="rtl">
      {/* Header & Pricing preview */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
            <CreditCard size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#F5F5DC]">بوابة الدفع الذكية (PayPal & Cards)</h4>
            <p className="text-[11px] text-[#A0A0A0]">سداد فوري مشفّر وآمن عبر PayPal أو البطاقات البنكية</p>
          </div>
        </div>

        <div className="text-left">
          <span className="text-lg font-black text-primary">${price.toFixed(2)}</span>
          <span className="text-[10px] text-[#808080] block">/ شهر</span>
        </div>
      </div>

      {sdkError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{sdkError}</span>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs flex items-center justify-center gap-2 font-bold animate-pulse">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>جاري تأكيد وتفعيل اشتراكك فوراً...</span>
        </div>
      )}

      {/* PayPal Smart Buttons Container */}
      {!isLoadingConfig && !isProcessing && (
        <div className="relative min-h-[120px] rounded-xl overflow-hidden pt-1">
          <PayPalScriptProvider
            options={{
              clientId: clientId || 'sb',
              currency: 'USD',
              intent: 'capture',
              components: 'buttons',
            }}
          >
            <PayPalButtons
              style={{
                layout: 'vertical',
                color: 'gold',
                shape: 'rect',
                label: 'pay',
                height: 44,
              }}
              createOrder={handleCreateOrder}
              onApprove={handleApprove}
              onCancel={() => {
                onCancel?.();
              }}
              onError={(err) => {
                console.error('PayPal SDK Runtime Error:', err);
                setSdkError('تعذر الاتصال ببوابة PayPal حالياً. يمكنك استخدام التفعيل السريع.');
              }}
            />
          </PayPalScriptProvider>
        </div>
      )}

      {/* Security & Guarantee Info */}
      <div className="flex items-center justify-between text-[11px] text-[#707070] pt-1">
        <div className="flex items-center gap-1">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span>تشفير 256-bit SSL لحماية بياناتك</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock size={12} className="text-primary" />
          <span>الترقية فورية وتلقائية</span>
        </div>
      </div>
    </div>
  );
};
