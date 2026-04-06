import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate, Link } from 'react-router-dom';
import {
  Leaf, User, Phone, Mail, Lock, Eye, EyeOff,
  ArrowLeft, CheckCircle2, Loader2,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import KYCForm from '../components/auth/KYCForm';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cn } from '@/lib/utils';

const STEPS = [
  { label: 'जानकारी', icon: User },
  { label: 'eKYC', icon: CheckCircle2 },
  { label: 'पूर्ण', icon: CheckCircle2 },
];

const stepVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export default function RegisterPage() {
  const { user, register, loading: authLoading } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1 fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
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

  if (user && step !== 2 && step !== 3) {
    return <Navigate to="/" replace />;
  }

  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  // Step 1 submit
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('कृपया अपना नाम दर्ज करें');
      return;
    }
    if (phone.replace(/\D/g, '').length !== 10) {
      setError('कृपया 10 अंकों का फ़ोन नंबर दर्ज करें');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('कृपया सही ईमेल दर्ज करें');
      return;
    }
    if (password.length < 6) {
      setError('पासवर्ड कम से कम 6 अक्षर का होना चाहिए');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        email: email.trim() || undefined,
        password,
      });
      toast.success('रजिस्ट्रेशन सफल!');
      goNext();
    } catch (err) {
      setError(err.message || 'रजिस्ट्रेशन में त्रुटि हुई। कृपया पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-8">
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
          className="flex flex-col items-center mb-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center mb-3">
            <Leaf size={30} className="text-green-950" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-100">
            मंडी<span className="text-amber-500">जी</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">नया अकाउंट बनाएं</p>
        </motion.div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;

            return (
              <div key={stepNum} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                      isCompleted && "bg-green-500 text-green-950",
                      isActive && "bg-amber-500 text-amber-950",
                      !isActive && !isCompleted && "bg-zinc-800 text-zinc-500"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] mt-1 transition-colors",
                      isActive ? "text-amber-400" : isCompleted ? "text-green-400" : "text-zinc-600"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-10 h-0.5 mb-4 transition-colors duration-300",
                      step > stepNum ? "bg-green-500" : "bg-zinc-800"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
          {/* Back Button */}
          {step > 1 && step < 3 && (
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              type="button"
              onClick={goBack}
              className="absolute top-4 left-4 z-10 flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              वापस
            </motion.button>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <motion.form
                key="step-1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                onSubmit={handleRegister}
                className="p-6 space-y-5"
              >
                <h2 className="text-lg font-semibold text-zinc-100 mb-1">
                  बुनियादी जानकारी
                </h2>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">पूरा नाम</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      type="text"
                      placeholder="अपना नाम दर्ज करें"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      autoComplete="name"
                    />
                  </div>
                </div>

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

                {/* Email (optional) */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">
                    ईमेल <span className="text-zinc-600">(वैकल्पिक)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoComplete="email"
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
                      placeholder="कम से कम 6 अक्षर"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      autoComplete="new-password"
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
                      रजिस्टर हो रहा है...
                    </>
                  ) : (
                    'रजिस्टर करें'
                  )}
                </motion.button>
              </motion.form>
            )}

            {/* Step 2: eKYC */}
            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="p-6 pt-12"
              >
                <KYCForm onComplete={goNext} />
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="p-6 flex flex-col items-center text-center py-12"
              >
                {/* Animated Checkmark */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center mb-6"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
                  >
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </motion.div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl font-bold text-zinc-100 mb-2"
                >
                  रजिस्ट्रेशन सफल!
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-zinc-400 mb-8 max-w-xs"
                >
                  आपका अकाउंट सफलतापूर्वक बन गया है। अब आप मंडीजी के सभी फीचर्स का उपयोग कर सकते हैं।
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="w-full"
                >
                  <Link to="/">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 text-green-950 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      डैशबोर्ड पर जाएं
                    </motion.button>
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Login Link */}
        {step === 1 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-6 text-sm text-zinc-500"
          >
            पहले से अकाउंट है?{' '}
            <Link
              to="/login"
              className="text-green-500 hover:text-green-400 font-medium transition-colors"
            >
              लॉग इन करें
            </Link>
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
