import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import Razorpay from 'razorpay';
import { readJSON, appendItem, findById, updateItem } from '../db/json-store.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_XXXXXXXXXXXXXXX',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret_XXXXXXXXXXXXXXX',
});

const KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_XXXXXXXXXXXXXXX';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret_XXXXXXXXXXXXXXX';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_test_secret';

const PLANS = {
  free: { id: 'free', nameHi: 'फ़्री', price: 0 },
  pro_monthly: {
    id: 'pro_monthly',
    nameHi: 'प्रो मासिक',
    price: 49900,        // paise
    priceDisplay: 499,
    interval: 'monthly',
    razorpayPlanId: process.env.RAZORPAY_MONTHLY_PLAN_ID || null,
  },
  pro_yearly: {
    id: 'pro_yearly',
    nameHi: 'प्रो वार्षिक',
    price: 499900,       // paise
    priceDisplay: 4999,
    interval: 'yearly',
  },
};

// GET /api/payments/plans — public, returns plan info
router.get('/plans', (req, res) => {
  res.json({
    free: { nameHi: 'फ़्री', price: 0 },
    pro_monthly: { nameHi: 'प्रो मासिक', price: 499 },
    pro_yearly: { nameHi: 'प्रो वार्षिक', price: 4999 },
  });
});

// POST /api/payments/create-subscription — monthly recurring
router.post('/create-subscription', authRequired, async (req, res) => {
  try {
    if (!PLANS.pro_monthly.razorpayPlanId) {
      return res.status(500).json({ error: 'मासिक प्लान अभी सेटअप नहीं हुआ। Razorpay Dashboard में प्लान बनाएं।' });
    }

    const user = findById('users.json', req.user.id);
    if (user?.subscription?.status === 'active' && user.subscription.plan !== 'free') {
      return res.status(400).json({ error: 'आपका प्लान पहले से सक्रिय है' });
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: PLANS.pro_monthly.razorpayPlanId,
      customer_notify: 1,
      total_count: 12,
      notes: { userId: req.user.id, userName: req.user.name },
    });

    res.json({ subscriptionId: subscription.id, key: KEY_ID });
  } catch (err) {
    console.error('Subscription creation failed:', err);
    res.status(500).json({ error: 'सब्सक्रिप्शन बनाने में विफल' });
  }
});

// POST /api/payments/create-order — yearly one-time
router.post('/create-order', authRequired, async (req, res) => {
  try {
    const { planId } = req.body;
    if (planId !== 'pro_yearly') {
      return res.status(400).json({ error: 'अमान्य प्लान' });
    }

    const user = findById('users.json', req.user.id);
    if (user?.subscription?.status === 'active' && user.subscription.plan !== 'free') {
      return res.status(400).json({ error: 'आपका प्लान पहले से सक्रिय है' });
    }

    const order = await razorpay.orders.create({
      amount: PLANS.pro_yearly.price,
      currency: 'INR',
      receipt: `rcpt_${uuid().slice(0, 8)}`,
      notes: { userId: req.user.id, planId: 'pro_yearly' },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: KEY_ID,
    });
  } catch (err) {
    console.error('Order creation failed:', err);
    res.status(500).json({ error: 'ऑर्डर बनाने में विफल' });
  }
});

// POST /api/payments/verify — verify payment signature (both types)
router.post('/verify', authRequired, async (req, res) => {
  try {
    const {
      type,
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_order_id,
      razorpay_signature,
      planId,
    } = req.body;

    let expectedSignature;
    if (type === 'subscription') {
      expectedSignature = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(razorpay_payment_id + '|' + razorpay_subscription_id)
        .digest('hex');
    } else {
      expectedSignature = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');
    }

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'भुगतान सत्यापन विफल' });
    }

    const now = new Date();
    const expiresAt = planId === 'pro_monthly'
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const subscription = {
      plan: planId,
      status: 'active',
      razorpaySubscriptionId: razorpay_subscription_id || null,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id || null,
      expiresAt,
      createdAt: now.toISOString(),
    };

    updateItem('users.json', req.user.id, { subscription });

    appendItem('payments.json', {
      id: uuid(),
      userId: req.user.id,
      userName: req.user.name,
      type,
      planId,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySubscriptionId: razorpay_subscription_id || null,
      razorpayOrderId: razorpay_order_id || null,
      amount: PLANS[planId]?.priceDisplay || 0,
      status: 'captured',
      createdAt: now.toISOString(),
    });

    res.json({ success: true, subscription });
  } catch (err) {
    console.error('Payment verification failed:', err);
    res.status(500).json({ error: 'भुगतान सत्यापन में त्रुटि' });
  }
});

// GET /api/payments/status — current user subscription
router.get('/status', authRequired, (req, res) => {
  try {
    const user = findById('users.json', req.user.id);
    const subscription = user?.subscription || { plan: 'free', status: 'none' };

    if (subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
      subscription.status = 'expired';
      updateItem('users.json', req.user.id, { subscription });
    }

    res.json({ subscription });
  } catch (err) {
    res.status(500).json({ error: 'स्थिति जाँचने में विफल' });
  }
});

// POST /api/payments/cancel — cancel monthly subscription
router.post('/cancel', authRequired, async (req, res) => {
  try {
    const user = findById('users.json', req.user.id);
    if (!user?.subscription?.razorpaySubscriptionId) {
      return res.status(400).json({ error: 'कोई सक्रिय सब्सक्रिप्शन नहीं' });
    }

    await razorpay.subscriptions.cancel(user.subscription.razorpaySubscriptionId, false);

    updateItem('users.json', req.user.id, {
      subscription: { ...user.subscription, status: 'cancelled' },
    });

    res.json({ success: true, message: 'सब्सक्रिप्शन रद्द किया गया' });
  } catch (err) {
    console.error('Cancel failed:', err);
    res.status(500).json({ error: 'सब्सक्रिप्शन रद्द करने में विफल' });
  }
});

// Webhook handler — exported separately, mounted before express.json()
export function webhookHandler(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(req.body.toString());
    const eventType = event.event;

    switch (eventType) {
      case 'subscription.charged': {
        const subId = event.payload.subscription.entity.id;
        const users = readJSON('users.json');
        const user = users.find(u => u.subscription?.razorpaySubscriptionId === subId);
        if (user) {
          const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          updateItem('users.json', user.id, {
            subscription: { ...user.subscription, status: 'active', expiresAt: newExpiry },
          });
        }
        break;
      }
      case 'subscription.cancelled':
      case 'subscription.halted':
      case 'subscription.completed': {
        const subId = event.payload.subscription.entity.id;
        const users = readJSON('users.json');
        const user = users.find(u => u.subscription?.razorpaySubscriptionId === subId);
        if (user) {
          updateItem('users.json', user.id, {
            subscription: { ...user.subscription, status: 'cancelled' },
          });
        }
        break;
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export default router;
