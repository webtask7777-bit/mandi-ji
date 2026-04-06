import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate, Link } from 'react-router-dom';
import { Leaf, Eye, EyeOff, Phone, Lock, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cn } from '@/lib/utils';
import SEO from '../components/SEO';

export default function LoginPage() {
  const { user, login, loading: authLoading } = useAuth();
  const toast = useToast();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('कृपया फ़ोन नंबर दर्ज करें');
      return;
    }
    if (phone.replace(/\D/g, '').length !== 10) {
      setError('कृपया 10 अंकों का फ़ोन नंबर दर्ज करें');
      return;
    }
    if (!password) {
      setError('कृपया पासवर्ड दर्ज करें');
      return;
    }
    if (password.length < 6) {
      setError('पासवर्ड कम से कम 6 अक्षर का होना चाहिए');
      return;
    }

    setLoading(true);
    try {
      await login(phone.replace(/\D/g, ''), password);
      toast.success('लॉगिन सफल!');
    } catch (err) {
      setError(err.message || 'लॉग इन में त्रुटि हुई। कृपया पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <SEO title="लॉगिन" description="MandiJi में लॉगिन करें। फसल बेचें, खरीदें, ई-वे बिल बनाएं।" path="/login" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-lg"
      >
        {/* Branding */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mb-4">
            <Leaf size={36} className="text-green-950" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-100">
            मंडी<span className="text-amber-500">जी</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">अपने अकाउंट में लॉग इन करें</p>
        </motion.div>

        {/* Form Card */}
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-6 space-y-5"
        >
          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">फ़ोन नंबर</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="10 अंकों का मोबाइल नंबर"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(val);
                }}
                className="pl-10"
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">पासवर्ड</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="अपना पासवर्ड दर्ज करें"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
            >
              {error}
            </motion.div>
          )}

          {/* Submit */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            className={cn(
              "w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
              loading
                ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-400 text-green-950"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                लॉग इन हो रहा है...
              </>
            ) : (
              'लॉग इन करें'
            )}
          </motion.button>
        </motion.form>

        {/* Register Link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6 text-sm text-zinc-500"
        >
          नया अकाउंट बनाना है?{' '}
          <Link
            to="/register"
            className="text-green-500 hover:text-green-400 font-medium transition-colors"
          >
            अभी रजिस्टर करें
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
