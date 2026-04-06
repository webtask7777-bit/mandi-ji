import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Check, Loader2, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useToast } from '../context/ToastContext';
import { apiPost } from '../api/client';
import { Card } from '@/components/ui/card';
import SEO from '../components/SEO';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const FREE_FEATURES = [
  'बुनियादी मंडी भाव',
  '8 मंडी तक तुलना',
  'बेसिक प्राइस चार्ट',
  'मौसम जानकारी',
];

const PRO_FEATURES = [
  'सभी मंडी भाव (असीमित)',
  'असीमित मंडी तुलना',
  'मुनाफ़ा कैलकुलेटर',
  'प्राइस अलर्ट (जल्द)',
  'एक्सपोर्ट रिपोर्ट (जल्द)',
  'प्राथमिकता सहायता',
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, subscription, refresh } = useSubscription();
  const toast = useToast();

  const [billingCycle, setBillingCycle] = useState('yearly');
  const [paymentLoading, setPaymentLoading] = useState(false);

  async function handlePayment() {
    if (!user) {
      navigate('/login');
      return;
    }

    if (isPro) {
      toast.info('आपका प्रो प्लान पहले से सक्रिय है');
      return;
    }

    setPaymentLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Razorpay लोड नहीं हुआ');

      const planId = billingCycle === 'monthly' ? 'pro_monthly' : 'pro_yearly';
      let paymentData;

      if (planId === 'pro_monthly') {
        paymentData = await apiPost('/payments/create-subscription', { planId });
      } else {
        paymentData = await apiPost('/payments/create-order', { planId });
      }

      const options = {
        key: paymentData.key,
        name: 'MandiJi Pro',
        description: planId === 'pro_monthly' ? 'मासिक सब्सक्रिप्शन — ₹499/महीना' : 'वार्षिक प्लान — ₹4,999/साल',
        ...(planId === 'pro_monthly'
          ? { subscription_id: paymentData.subscriptionId }
          : { order_id: paymentData.orderId, amount: paymentData.amount, currency: paymentData.currency }
        ),
        prefill: {
          name: user.name,
          contact: user.phone,
          email: user.email || '',
        },
        theme: { color: '#22c55e' },
        handler: async function (response) {
          try {
            await apiPost('/payments/verify', {
              type: planId === 'pro_monthly' ? 'subscription' : 'order',
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              planId,
            });
            toast.success('भुगतान सफल! Pro प्लान सक्रिय हो गया');
            refresh();
            navigate('/');
          } catch {
            toast.error('भुगतान सत्यापन विफल');
          } finally {
            setPaymentLoading(false);
          }
        },
        modal: {
          ondismiss: () => setPaymentLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.message || 'भुगतान शुरू करने में विफल');
      setPaymentLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Pro प्लान" description="MandiJi Pro — असीमित मंडी भाव, मुनाफ़ा कैलकुलेटर, प्राइस अलर्ट। ₹499/महीना या ₹4,999/साल।" path="/pricing" />

      <div className="max-w-lg mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background border-b border-zinc-800">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft size={16} className="text-zinc-400" />
            </button>
            <div className="flex items-center gap-2">
              <Crown size={18} className="text-amber-400" />
              <h1 className="text-base font-bold">MandiJi Pro</h1>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 flex flex-col gap-5">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold mb-3">
              <Zap size={12} /> प्रो में अपग्रेड करें
            </div>
            <h2 className="text-lg font-extrabold">पूरे भारत की मंडी इंटेलिजेंस</h2>
            <p className="text-xs text-muted-foreground mt-1">120+ फसलें, 16,000+ मंडी — सब अनलिमिटेड</p>
          </motion.div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                billingCycle === 'monthly' ? 'bg-zinc-800 text-foreground' : 'text-zinc-500'
              }`}
            >
              मासिक
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors relative ${
                billingCycle === 'yearly' ? 'bg-zinc-800 text-foreground' : 'text-zinc-500'
              }`}
            >
              वार्षिक
              <span className="absolute -top-2 -right-1 text-[8px] font-bold bg-green-500 text-green-950 px-1.5 py-0.5 rounded-full">
                17% बचत
              </span>
            </button>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Free Plan */}
            <Card className="bg-zinc-900 border-zinc-800 p-4 flex flex-col">
              <div className="text-[10px] text-zinc-500 font-semibold tracking-wider mb-1">फ़्री</div>
              <div className="text-xl font-extrabold mb-0.5">₹0</div>
              <div className="text-[10px] text-zinc-500 mb-4">हमेशा फ़्री</div>
              <div className="flex flex-col gap-2 flex-1">
                {FREE_FEATURES.map((f) => (
                  <div key={f} className="flex items-start gap-1.5">
                    <Check size={12} className="text-zinc-500 mt-0.5 shrink-0" />
                    <span className="text-[10px] text-zinc-400">{f}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 py-2 text-center text-[11px] text-zinc-500 font-semibold rounded-lg border border-zinc-800">
                {isPro ? 'फ़्री प्लान' : 'मौजूदा प्लान'}
              </div>
            </Card>

            {/* Pro Plan */}
            <Card className="bg-zinc-900 border-amber-500/30 p-4 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-green-500" />
              <div className="flex items-center gap-1.5 mb-1">
                <Crown size={12} className="text-amber-400" />
                <span className="text-[10px] text-amber-400 font-bold tracking-wider">प्रो</span>
              </div>
              <div className="text-xl font-extrabold mb-0.5">
                ₹{billingCycle === 'monthly' ? '499' : '4,999'}
              </div>
              <div className="text-[10px] text-zinc-500 mb-4">
                {billingCycle === 'monthly' ? '/महीना' : '/साल'}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {PRO_FEATURES.map((f) => (
                  <div key={f} className="flex items-start gap-1.5">
                    <Check size={12} className="text-amber-400 mt-0.5 shrink-0" />
                    <span className="text-[10px] text-foreground">{f}</span>
                  </div>
                ))}
              </div>

              {isPro ? (
                <div className="mt-4 py-2 text-center text-[11px] text-green-400 font-bold rounded-lg border border-green-500/30 bg-green-500/10">
                  सक्रिय
                </div>
              ) : (
                <button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="mt-4 py-2.5 w-full text-center text-[11px] font-bold rounded-lg bg-amber-500 text-amber-950 hover:bg-amber-400 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {paymentLoading ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" /> प्रोसेसिंग...
                    </span>
                  ) : (
                    'अभी शुरू करें'
                  )}
                </button>
              )}
            </Card>
          </div>

          {/* Active Subscription Info */}
          {isPro && subscription && (
            <Card className="bg-green-500/10 border-green-500/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={14} className="text-amber-400" />
                <span className="text-xs font-bold text-green-400">आपका प्रो प्लान सक्रिय है</span>
              </div>
              <div className="text-[10px] text-zinc-400 space-y-1">
                <div>प्लान: {subscription.plan === 'pro_monthly' ? 'मासिक ₹499' : 'वार्षिक ₹4,999'}</div>
                {subscription.expiresAt && (
                  <div>समाप्ति: {new Date(subscription.expiresAt).toLocaleDateString('hi-IN')}</div>
                )}
              </div>
              {subscription.razorpaySubscriptionId && (
                <button
                  onClick={async () => {
                    try {
                      await apiPost('/payments/cancel', {});
                      toast.success('सब्सक्रिप्शन रद्द किया गया');
                      refresh();
                    } catch (err) {
                      toast.error(err.message || 'रद्द करने में विफल');
                    }
                  }}
                  className="mt-2 text-[10px] text-red-400 underline"
                >
                  सब्सक्रिप्शन रद्द करें
                </button>
              )}
            </Card>
          )}

          {/* Trust Signals */}
          <div className="text-center space-y-1 pb-4">
            <div className="text-[10px] text-zinc-500">Razorpay द्वारा सुरक्षित भुगतान</div>
            <div className="text-[10px] text-zinc-600">UPI, Cards, Net Banking, Wallets</div>
          </div>
        </main>
      </div>
    </div>
  );
}
