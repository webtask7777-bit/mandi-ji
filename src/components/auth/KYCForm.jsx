import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Loader2, Fingerprint } from 'lucide-react';
import { Input } from '../ui/input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { cn } from '@/lib/utils';

export default function KYCForm({ onComplete }) {
  const { updateKYC } = useAuth();
  const toast = useToast();

  const [digilockerStatus, setDigilockerStatus] = useState('idle'); // idle | loading | verified
  const [aadhaar, setAadhaar] = useState('');
  const [pan, setPan] = useState('');
  const [kisanId, setKisanId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Format Aadhaar for display: XXXX XXXX 1234
  const formatAadhaarDisplay = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    if (digits.length <= 4) return digits;
    if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
  };

  const getMaskedAadhaar = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 12) return formatAadhaarDisplay(value);
    return `XXXX XXXX ${digits.slice(8, 12)}`;
  };

  const handleAadhaarChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaar(raw);
  };

  const handlePanChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setPan(val);
  };

  const handleDigilocker = () => {
    setDigilockerStatus('loading');
    setError('');
    // Simulated DigiLocker verification
    setTimeout(() => {
      setDigilockerStatus('verified');
      setAadhaar('998877665544'); // Simulated verified Aadhaar
    }, 2000);
  };

  const handleSubmit = async () => {
    setError('');

    // Validation: need either DigiLocker or at least Aadhaar
    if (digilockerStatus !== 'verified' && aadhaar.replace(/\D/g, '').length !== 12) {
      setError('कृपया 12 अंकों का आधार नंबर दर्ज करें या DigiLocker से सत्यापित करें');
      return;
    }

    // PAN validation if provided
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      setError('PAN नंबर सही फॉर्मेट में नहीं है (जैसे ABCDE1234F)');
      return;
    }

    setSubmitting(true);
    try {
      const kycData = {
        aadhaar: aadhaar.replace(/\D/g, ''),
        verifiedViaDigilocker: digilockerStatus === 'verified',
      };
      if (pan) kycData.pan = pan;
      if (kisanId) kycData.kisanId = kisanId;

      await updateKYC(kycData);
      toast.success('KYC सत्यापित!');
      onComplete?.();
    } catch (err) {
      setError(err.message || 'KYC अपडेट में त्रुटि हुई');
    } finally {
      setSubmitting(false);
    }
  };

  const isDigilockerDone = digilockerStatus === 'verified';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-100">eKYC सत्यापन</h3>
          <p className="text-xs text-zinc-500">अपनी पहचान सत्यापित करें</p>
        </div>
      </div>

      {/* DigiLocker Section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <Fingerprint className="w-4 h-4 text-green-500" />
          <span className="font-medium">DigiLocker सत्यापन</span>
        </div>

        {digilockerStatus === 'idle' && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleDigilocker}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            DigiLocker से सत्यापित करें
          </motion.button>
        )}

        {digilockerStatus === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            DigiLocker से जुड़ रहे हैं...
          </div>
        )}

        {digilockerStatus === 'verified' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-green-500/10 border border-green-500/20"
          >
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-400 font-medium">सत्यापित</span>
          </motion.div>
        )}
      </div>

      {/* OR Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-500 font-medium">या मैन्युअल रूप से दर्ज करें</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      {/* Manual Entry */}
      <div className="space-y-4">
        {/* Aadhaar */}
        <div className="space-y-1.5">
          <label className="text-sm text-zinc-400">
            आधार नंबर <span className="text-red-400">*</span>
          </label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="XXXX XXXX XXXX"
            value={isDigilockerDone ? getMaskedAadhaar(aadhaar) : formatAadhaarDisplay(aadhaar)}
            onChange={handleAadhaarChange}
            disabled={isDigilockerDone}
            className={cn(
              isDigilockerDone && 'bg-zinc-800/50 text-green-400 border-green-500/30'
            )}
          />
          {aadhaar.length > 0 && aadhaar.length < 12 && !isDigilockerDone && (
            <p className="text-xs text-zinc-500">{aadhaar.length}/12 अंक</p>
          )}
        </div>

        {/* PAN */}
        <div className="space-y-1.5">
          <label className="text-sm text-zinc-400">
            PAN कार्ड <span className="text-zinc-600">(वैकल्पिक)</span>
          </label>
          <Input
            type="text"
            placeholder="ABCDE1234F"
            value={pan}
            onChange={handlePanChange}
            maxLength={10}
          />
          <p className="text-xs text-zinc-600">फॉर्मेट: ABCDE1234F</p>
        </div>

        {/* Kisan Card / PM-KISAN */}
        <div className="space-y-1.5">
          <label className="text-sm text-zinc-400">
            किसान कार्ड / PM-KISAN ID <span className="text-zinc-600">(वैकल्पिक)</span>
          </label>
          <Input
            type="text"
            placeholder="PM-KISAN रजिस्ट्रेशन नंबर"
            value={kisanId}
            onChange={(e) => setKisanId(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
        >
          {error}
        </motion.p>
      )}

      {/* Submit */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSubmit}
        disabled={submitting}
        className={cn(
          "w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
          submitting
            ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
            : "bg-green-500 hover:bg-green-400 text-green-950"
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            सबमिट हो रहा है...
          </>
        ) : (
          'आगे बढ़ें'
        )}
      </motion.button>
    </div>
  );
}
