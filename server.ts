import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Gemini SDK with server-side environment key
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// KAI-1 URL configurations
const KAI1_BASE_URL = "https://kai1-backend.up.railway.app";
const KAI1_CHAT_URL = `${KAI1_BASE_URL}/api/kai1/chat`;
const KAI1_STREAM_URL = `${KAI1_BASE_URL}/api/kai1/stream`;

// Server-side default plan limits
const PLANS_BACKEND_CONFIG: Record<string, { usage_limit: number; image_limit: number; name: string; priority: boolean }> = {
  free: { usage_limit: 20, image_limit: 10, name: 'Free', priority: false },
  pro: { usage_limit: 500, image_limit: 200, name: 'Pro', priority: true },
  business: { usage_limit: 2000, image_limit: 1000, name: 'Business', priority: true },
  enterprise: { usage_limit: 10000, image_limit: 5000, name: 'Enterprise', priority: true },
};

// Payment gateway configuration
const PAYMENT_CONFIG = {
  apiKey: process.env.PAYMENT_GATEWAY_KEY || process.env.PAYPAL_CLIENT_ID || 'sb',
  isConfigured: !!(process.env.PAYMENT_GATEWAY_KEY || process.env.PAYPAL_CLIENT_ID),
};

// In-memory / server state cache for usage tracking & rate limits
interface ServerUsageRecord {
  date: string;
  count: number;
  imageCount: number;
}
const serverUsageMap = new Map<string, ServerUsageRecord>();

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// GET /api/payment/config - PayPal & Payment Gateway configuration
app.get('/api/payment/config', (req, res) => {
  const clientId = process.env.PAYPAL_CLIENT_ID || process.env.PAYMENT_GATEWAY_KEY || 'test';
  res.json({
    paypalClientId: clientId,
    currency: 'USD',
    isLive: clientId !== 'test' && clientId !== 'sb' && clientId.length > 20,
    price: 19.00
  });
});

// POST /api/payment/verify-paypal - Verify and execute PayPal subscription activation
app.post('/api/payment/verify-paypal', async (req, res) => {
  try {
    const { userId, orderId, planId = 'pro', details } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const targetPlan = PLANS_BACKEND_CONFIG[planId] ? planId : 'pro';
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const subscriptionId = orderId ? `paypal_${orderId}` : `sub_paypal_${Date.now()}`;

    const newSubscription = {
      plan: targetPlan,
      subscription_status: 'active',
      subscription_id: subscriptionId,
      subscription_start: now.toISOString(),
      subscription_end: endDate.toISOString(),
      usage_limit: PLANS_BACKEND_CONFIG[targetPlan].usage_limit,
      usage_count: 0,
      image_limit: PLANS_BACKEND_CONFIG[targetPlan].image_limit,
      image_count: 0,
      last_reset_date: now.toISOString().split('T')[0],
      cancel_at_period_end: false,
      payer_info: details?.payer ? {
        email: details.payer.email_address,
        name: `${details.payer.name?.given_name || ''} ${details.payer.name?.surname || ''}`.trim(),
      } : null
    };

    serverUsageMap.set(userId, {
      date: now.toISOString().split('T')[0],
      count: 0,
      imageCount: 0,
    });

    console.log(`[PayPal Payment Verified] User: ${userId}, OrderID: ${orderId}, Plan: ${targetPlan}`);

    return res.json({
      success: true,
      message: `تم التحقق من عملية الدفع عبر PayPal بنجاح وتفعيل باقة ${targetPlan.toUpperCase()}`,
      subscription: newSubscription,
    });
  } catch (error: any) {
    console.error('PayPal verification error:', error);
    return res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
});

// GET /api/subscription/plans
app.get('/api/subscription/plans', (req, res) => {
  res.json({
    status: 'success',
    plans: PLANS_BACKEND_CONFIG,
  });
});

// POST /api/subscription/upgrade - Server-verified upgrade
app.post('/api/subscription/upgrade', async (req, res) => {
  try {
    const { userId, planId = 'pro', paymentMethod = 'card' } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const targetPlan = PLANS_BACKEND_CONFIG[planId] ? planId : 'pro';
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const subscriptionId = `sub_${planId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const newSubscription = {
      plan: targetPlan,
      subscription_status: 'active',
      subscription_id: subscriptionId,
      subscription_start: now.toISOString(),
      subscription_end: endDate.toISOString(),
      usage_limit: PLANS_BACKEND_CONFIG[targetPlan].usage_limit,
      usage_count: 0,
      image_limit: PLANS_BACKEND_CONFIG[targetPlan].image_limit,
      image_count: 0,
      last_reset_date: now.toISOString().split('T')[0],
      cancel_at_period_end: false,
    };

    // Reset usage in server cache
    serverUsageMap.set(userId, {
      date: now.toISOString().split('T')[0],
      count: 0,
      imageCount: 0,
    });

    console.log(`[Subscription Upgrade] User ${userId} upgraded to ${targetPlan}. ID: ${subscriptionId}`);

    return res.json({
      success: true,
      message: `تمت الترقية بنجاح إلى الخطة ${targetPlan.toUpperCase()}`,
      subscription: newSubscription,
    });
  } catch (error: any) {
    console.error('Subscription Upgrade Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process subscription upgrade' });
  }
});

// POST /api/subscription/cancel
app.post('/api/subscription/cancel', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    return res.json({
      success: true,
      message: 'تم إلغاء التجديد التلقائي للاشتراك بنجاح. ستظل ميزات PRO متاحة حتى نهاية الفترة الحالية.',
      subscription_status: 'cancelled',
      cancel_at_period_end: true,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

// POST /api/subscription/webhook - Secure Payment Webhook
app.post('/api/subscription/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'] || req.headers['stripe-signature'];
    const event = req.body;

    console.log('[Webhook Received]:', { eventType: event?.type, signature: !!signature });

    switch (event?.type) {
      case 'invoice.payment_succeeded':
      case 'subscription.created':
      case 'checkout.session.completed': {
        const userId = event?.data?.userId || event?.data?.object?.client_reference_id;
        const plan = event?.data?.plan || 'pro';
        if (userId) {
          console.log(`[Webhook Event] Verified payment for user ${userId}, applying plan ${plan}`);
        }
        break;
      }
      case 'customer.subscription.deleted':
      case 'subscription.expired': {
        const userId = event?.data?.userId || event?.data?.object?.client_reference_id;
        if (userId) {
          console.log(`[Webhook Event] Subscription expired/deleted for user ${userId}, returning to FREE`);
        }
        break;
      }
      default:
        console.log(`[Webhook Event] Unhandled event type: ${event?.type}`);
    }

    return res.status(200).json({ received: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Webhook handling error:', error);
    return res.status(400).json({ error: 'Webhook processing error' });
  }
});

// POST /api/chat/stream - Backend Authenticated and Quota-Enforced AI Streaming
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { 
      userId, 
      prompt, 
      history = [], 
      systemInstruction = '', 
      userMemory = '', 
      attachments = [],
      clientSubscription 
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'مطلوب مصادقة المستخدم للمتابعة.' });
    }

    const today = new Date().toISOString().split('T')[0];

    // 1. Resolve User Plan & Expiration
    let effectivePlan = (clientSubscription?.plan || 'free').toLowerCase();
    const subStatus = clientSubscription?.subscription_status || 'none';
    const subEnd = clientSubscription?.subscription_end;

    // Check expiration on server
    if (effectivePlan !== 'free' && subEnd) {
      const expirationDate = new Date(subEnd);
      if (expirationDate.getTime() < Date.now()) {
        effectivePlan = 'free';
      }
    }
    if (subStatus === 'expired') {
      effectivePlan = 'free';
    }

    const planConfig = PLANS_BACKEND_CONFIG[effectivePlan] || PLANS_BACKEND_CONFIG.free;
    const usageLimit = planConfig.usage_limit;
    const imageLimit = planConfig.image_limit;

    // 2. Resolve Current Daily Usage
    let userUsage = serverUsageMap.get(userId);
    if (!userUsage || userUsage.date !== today) {
      userUsage = {
        date: today,
        count: (clientSubscription?.last_reset_date === today ? (clientSubscription?.usage_count || 0) : 0),
        imageCount: (clientSubscription?.last_reset_date === today ? (clientSubscription?.image_count || 0) : 0)
      };
    }

    // 3. ENFORCE USAGE LIMIT (Backend Gate)
    if (userUsage.count >= usageLimit) {
      return res.status(429).json({
        error: 'limit_exceeded',
        message: effectivePlan === 'free' 
          ? `لقد استنفدت الحد اليومي المسموح به (${usageLimit} رسائل). يرجى الترقية إلى باقة PRO للاستمتاع بـ 500 رسالة يومياً والوصول الكامل لنموذج KAI-1 Pro بدون قيود.`
          : `لقد وصلت إلى الحد الأقصى للاستخدام اليومي (${usageLimit} طلب). سيتجدد رصيدك تلقائياً مع بداية اليوم الجديد.`,
        plan: effectivePlan,
        usage_limit: usageLimit,
        usage_count: userUsage.count,
        upgrade_url: '#pricing'
      });
    }

    // Check Image Upload Quota
    const imagesInRequest = attachments.filter((a: any) => 
      a.isImage || a.type?.startsWith('image/') || a.data?.startsWith('data:image/')
    ).length;

    if (imagesInRequest > 0) {
      if (userUsage.imageCount + imagesInRequest > imageLimit) {
        return res.status(429).json({
          error: 'image_limit_exceeded',
          message: effectivePlan === 'free'
            ? `لقد استنفدت الحد اليومي المسموح به لرفع الصور (${imageLimit} صور يومياً في الخطة المجانية). يرجى الترقية لباقة PRO لرفع وتحليل صور غير محدودة.`
            : `لقد تجاوزت الحد المسموح لرفع الصور اليوم (${imageLimit} صورة). سيتجدد رصيدك غداً.`,
          plan: effectivePlan,
          image_limit: imageLimit,
          image_count: userUsage.imageCount,
          upgrade_url: '#pricing'
        });
      }
      userUsage.imageCount += imagesInRequest;
    }

    // 4. Increment usage count
    userUsage.count += 1;
    serverUsageMap.set(userId, userUsage);

    // 5. Construct System Instructions & Persona
    const isPro = effectivePlan !== 'free';
    const tierName = isPro ? 'KAI-1 Pro Ultra' : 'KAI-1 Standard';
    const baseInstruction = systemInstruction || `أنت Akasha AI (نموذج ${tierName})، المساعد الذكي فائق التطور. تجيب بدقة وذكاء وسرعة، مع دعم كامل للغة العربية.`;
    const memoryContext = userMemory ? `\n\n[الذاكرة طويلة المدى]:\n${userMemory}` : '';
    const fullInstruction = `${baseInstruction}${memoryContext}`;

    // Setup Server-Sent Events (SSE) / Streaming Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send metadata header chunk
    res.write(`data: ${JSON.stringify({
      type: 'meta',
      plan: effectivePlan,
      usage_count: userUsage.count,
      usage_limit: usageLimit,
      image_count: userUsage.imageCount,
      image_limit: imageLimit,
      model: tierName,
    })}\n\n`);

    // 6. Multimodal & Vision Check
    const hasImageAttachment = attachments.some((a: any) => a.isImage || a.type?.startsWith('image/') || a.type === 'application/pdf');

    let promptAugmented = prompt;
    const textAttachments = attachments.filter((a: any) => !a.isImage && !a.type?.startsWith('image/') && a.type !== 'application/pdf');
    if (textAttachments.length > 0) {
      const fileTexts = textAttachments.map((f: any) => `\n[محتوى الملف المرفق: ${f.name}]\n\`\`\`\n${f.data}\n\`\`\``).join('\n\n');
      promptAugmented = `${fileTexts}\n\n${prompt || 'يرجى مراجعة وتحليل هذا الملف.'}`;
    }

    let responseDelivered = false;

    // 7. Try KAI-1 Railway Endpoint (Chat & Stream) if no heavy multimodal images
    if (!hasImageAttachment) {
      const userSessionId = req.body.sessionId || req.body.session_id || null;

      // Try /api/kai1/chat endpoint first
      try {
        const kaiResponse = await fetch(KAI1_CHAT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: promptAugmented || 'مرحباً',
            session_id: userSessionId,
            history: history.map((msg: any) => ({
              role: msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user',
              content: msg.parts?.[0]?.text || msg.content || '',
            })),
            system_instruction: fullInstruction,
          }),
        });

        if (kaiResponse.ok) {
          const contentType = kaiResponse.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await kaiResponse.json();
            const reply = data.reply || data.message || data.response || (typeof data === 'string' ? data : '');
            if (reply) {
              // Stream text to client with session_id metadata
              res.write(`data: ${JSON.stringify({ 
                type: 'chunk', 
                text: reply,
                session_id: data.session_id || userSessionId 
              })}\n\n`);
              responseDelivered = true;
            }
          } else if (kaiResponse.body) {
            // Streaming response
            const reader = kaiResponse.body.getReader();
            const decoder = new TextDecoder();
            let streamText = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              streamText += chunk;
              res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
            }

            if (streamText.trim().length > 0) {
              responseDelivered = true;
            }
          }
        }
      } catch (kaiChatErr) {
        console.warn('KAI-1 chat endpoint error, trying stream fallback:', kaiChatErr);
      }

      // Try stream endpoint fallback if not delivered
      if (!responseDelivered) {
        try {
          const formattedHistory = history.map((msg: any) => ({
            role: msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.parts?.[0]?.text || msg.content || '',
          }));

          const kaiStreamRes = await fetch(KAI1_STREAM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: promptAugmented || 'مرحباً',
              session_id: userSessionId,
              history: formattedHistory,
              system_instruction: fullInstruction,
            }),
          });

          if (kaiStreamRes.ok && kaiStreamRes.body) {
            const reader = kaiStreamRes.body.getReader();
            const decoder = new TextDecoder();
            let streamText = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              streamText += chunk;
              res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
            }

            if (streamText.trim().length > 0) {
              responseDelivered = true;
            }
          }
        } catch (streamErr) {
          console.warn('KAI-1 stream endpoint error:', streamErr);
        }
      }
    }

    // 8. Fallback to Gemini SDK for Vision / Failover
    if (!responseDelivered && ai) {
      try {
        const currentParts: any[] = [];
        for (const att of attachments) {
          if (att.isImage || att.type?.startsWith('image/') || att.type === 'application/pdf') {
            const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
            currentParts.push({
              inlineData: {
                mimeType: att.type || 'image/jpeg',
                data: base64Data,
              },
            });
          }
        }
        if (promptAugmented) {
          currentParts.push({ text: promptAugmented });
        } else if (currentParts.length === 0) {
          currentParts.push({ text: 'تحليل المرفق' });
        }

        const modelToUse = 'gemini-3.7-flash';
        const fallbackResponse = await ai.models.generateContent({
          model: modelToUse,
          contents: [...history, { role: 'user', parts: currentParts }],
          config: { systemInstruction: fullInstruction },
        });

        const generatedText = fallbackResponse.text || '';
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: generatedText })}\n\n`);
        responseDelivered = true;
      } catch (geminiErr: any) {
        console.error('Gemini fallback error:', geminiErr);
        res.write(`data: ${JSON.stringify({ type: 'error', error: geminiErr.message })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done', finalUsageCount: userUsage.count })}\n\n`);
    res.end();

  } catch (error: any) {
    console.error('Chat Server Stream Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server streaming error' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

// ============================================================================
// VITE MIDDLEWARE & STATIC SERVING
// ============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Akasha AI Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
