import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Truck, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, apiPost } from '@/api/client';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/utils/animations';

export default function CreateListingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();
  const toast = useToast();

  // Pre-select type and crop from URL params
  const initialType = searchParams.get('type') === 'buy' ? 'buy' : 'sell';
  const initialCrop = searchParams.get('crop') || '';
  const initialMandi = searchParams.get('mandi') || '';

  const [type, setType] = useState(initialType);
  const [cropId, setCropId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [mandiName, setMandiName] = useState(initialMandi);
  const [description, setDescription] = useState('');
  const [crops, setCrops] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch crops for dropdown
  useEffect(() => {
    apiFetch('/crops?state=all')
      .then(data => {
        const list = Array.isArray(data) ? data : data?.crops || [];
        setCrops(list);
        // Auto-select crop from URL param
        if (initialCrop && list.length > 0) {
          const match = list.find(c => c.id === initialCrop || c._id === initialCrop);
          if (match) setCropId(match._id || match.id);
        }
      })
      .catch(() => setCrops([]));
  }, []);

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-foreground max-w-lg mx-auto flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🔒</span>
        <p className="text-sm text-zinc-400 text-center">लिस्टिंग बनाने के लिए पहले लॉग इन करें</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 rounded-xl bg-green-500 text-green-950 font-bold text-sm"
        >
          लॉग इन करें
        </button>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!cropId) { setError('फसल चुनें'); return; }
    if (!quantity || Number(quantity) <= 0) { setError('सही मात्रा दर्ज करें'); return; }
    if (!price || Number(price) <= 0) { setError('सही भाव दर्ज करें'); return; }
    if (!mandiName.trim()) { setError('मंडी / स्थान दर्ज करें'); return; }

    const selectedCrop = crops.find(c => (c._id || c.id) === cropId);

    const body = {
      type,
      cropId,
      cropName: selectedCrop?.nameHi || selectedCrop?.name || '',
      cropEmoji: selectedCrop?.emoji || '🌾',
      quantity: Number(quantity),
      pricePerUnit: Number(price),
      mandiName: mandiName.trim(),
      description: description.trim(),
    };

    try {
      setSubmitting(true);
      await apiPost('/listings', body);
      toast.success('लिस्टिंग पोस्ट हो गई!');
      navigate('/');
    } catch (err) {
      setError(err.message || 'लिस्टिंग बनाने में समस्या हुई');
      toast.error(err.message || 'लिस्टिंग बनाने में समस्या हुई');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <h1 className="text-base font-bold">नई लिस्टिंग</h1>
        </div>
      </header>

      {/* Form */}
      <motion.form
        {...fadeInUp}
        onSubmit={handleSubmit}
        className="flex-1 px-4 py-4 flex flex-col gap-4"
      >
        {/* Type Toggle */}
        <div>
          <label className="text-xs font-semibold text-zinc-400 mb-2 block">प्रकार</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('sell')}
              className={cn(
                'h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition-all',
                type === 'sell'
                  ? 'bg-green-500 text-green-950 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              )}
            >
              <Truck size={18} strokeWidth={2.5} />
              बेचना चाहते हैं
            </button>
            <button
              type="button"
              onClick={() => setType('buy')}
              className={cn(
                'h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition-all',
                type === 'buy'
                  ? 'bg-amber-500 text-amber-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              )}
            >
              <ShoppingCart size={18} strokeWidth={2.5} />
              खरीदना चाहते हैं
            </button>
          </div>
        </div>

        {/* Crop Selector */}
        <div>
          <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">फसल चुनें</label>
          <select
            value={cropId}
            onChange={e => setCropId(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-foreground outline-none focus:border-green-500 transition-colors appearance-none"
          >
            <option value="">-- फसल चुनें --</option>
            {crops.map(crop => (
              <option key={crop._id || crop.id} value={crop._id || crop.id}>
                {crop.emoji || '🌱'} {crop.nameHi || crop.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">मात्रा (क्विंटल)</label>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="उदा. 50"
            min="0"
            step="0.1"
            className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-foreground outline-none focus:border-green-500 transition-colors placeholder:text-zinc-600"
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">भाव (₹/क्विंटल)</label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="उदा. 2500"
            min="0"
            step="1"
            className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-foreground outline-none focus:border-green-500 transition-colors placeholder:text-zinc-600"
          />
        </div>

        {/* Mandi / Location */}
        <div>
          <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">मंडी / स्थान</label>
          <input
            type="text"
            value={mandiName}
            onChange={e => setMandiName(e.target.value)}
            placeholder="उदा. रायपुर मंडी"
            className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-foreground outline-none focus:border-green-500 transition-colors placeholder:text-zinc-600"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">विवरण (वैकल्पिक)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="अपनी फसल या ज़रूरत के बारे में लिखें..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-foreground outline-none focus:border-green-500 transition-colors resize-none placeholder:text-zinc-600"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'w-full h-12 rounded-xl font-bold text-sm transition-all',
            submitting
              ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              : 'bg-green-500 text-green-950 shadow-[0_0_20px_rgba(34,197,94,0.3)] active:scale-[0.98]'
          )}
        >
          {submitting ? 'पोस्ट हो रहा है...' : 'पोस्ट करें'}
        </button>
      </motion.form>
    </div>
  );
}
