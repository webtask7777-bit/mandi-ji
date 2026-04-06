import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Calculator, Clock, MapPin, Weight, IndianRupee, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiPost } from '../../api/client';

const VEHICLES = [
  { id: 'tractor', name: 'ट्रैक्टर ट्रॉली', emoji: '\uD83D\uDE9C', cap: 30 },
  { id: 'pickup', name: 'पिकअप', emoji: '\uD83D\uDEFB', cap: 20 },
  { id: 'truck-small', name: 'छोटा ट्रक', emoji: '\uD83D\uDE9B', cap: 70 },
  { id: 'truck-large', name: 'बड़ा ट्रक', emoji: '\uD83D\uDE9B', cap: 160 },
  { id: 'trailer', name: 'ट्रेलर', emoji: '\uD83D\uDE9A', cap: 250 },
];

function formatCurrency(num) {
  return new Intl.NumberFormat('hi-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
}

export default function TransportCalc() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [weight, setWeight] = useState('');
  const [vehicleType, setVehicleType] = useState('truck-small');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCalculate() {
    if (!origin.trim() || !destination.trim() || !weight) {
      setError('सभी फ़ील्ड भरें');
      return;
    }
    if (Number(weight) <= 0) {
      setError('मात्रा 0 से अधिक होनी चाहिए');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = await apiPost('/transport/calculate', {
        origin: origin.trim(),
        destination: destination.trim(),
        weightQuintals: Number(weight),
        vehicleType,
      }, false);
      setResult(data);
    } catch (err) {
      setError(err.message || 'कैलकुलेशन विफल');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Origin */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          <MapPin size={12} className="inline mr-1 text-green-500" />
          कहाँ से (मंडी)
        </label>
        <input
          type="text"
          value={origin}
          onChange={e => setOrigin(e.target.value)}
          placeholder="जैसे: रायपुर मंडी"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-600 focus:border-green-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Destination */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          <MapPin size={12} className="inline mr-1 text-amber-500" />
          कहाँ तक (मंडी)
        </label>
        <input
          type="text"
          value={destination}
          onChange={e => setDestination(e.target.value)}
          placeholder="जैसे: दुर्ग मंडी"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-600 focus:border-green-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Weight */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          <Weight size={12} className="inline mr-1 text-blue-400" />
          मात्रा (क्विंटल)
        </label>
        <input
          type="number"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          placeholder="जैसे: 50"
          min="1"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-600 focus:border-green-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Vehicle Type Selector */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-2">
          <Truck size={12} className="inline mr-1 text-green-500" />
          वाहन चुनें
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {VEHICLES.map(v => (
            <button
              key={v.id}
              onClick={() => setVehicleType(v.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all active:scale-95 min-w-[80px] ${
                vehicleType === v.id
                  ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/10'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <span className="text-2xl">{v.emoji}</span>
              <span className={`text-[10px] font-medium leading-tight text-center ${
                vehicleType === v.id ? 'text-green-400' : 'text-zinc-400'
              }`}>
                {v.name}
              </span>
              <span className="text-[9px] text-zinc-500">{v.cap}q</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Calculate Button */}
      <button
        onClick={handleCalculate}
        disabled={loading}
        className="w-full bg-green-500 hover:bg-green-600 text-green-950 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <span className="animate-pulse">कैलकुलेट हो रहा है...</span>
        ) : (
          <>
            <Calculator size={16} />
            कैलकुलेट करें
          </>
        )}
      </button>

      {/* Result Card */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            {/* Total Cost */}
            <div className="bg-green-500/10 border-b border-zinc-800 px-4 py-4 text-center">
              <div className="text-xs text-zinc-400 mb-1">कुल अनुमानित लागत</div>
              <div className="text-3xl font-black text-green-500">
                {formatCurrency(result.totalCost)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                {result.vehicleName} &middot; {result.trips} {result.trips > 1 ? 'ट्रिप' : 'ट्रिप'}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="px-4 py-3 space-y-2">
              <div className="text-xs font-semibold text-zinc-400 mb-2">लागत विवरण</div>

              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">बेस चार्ज</span>
                <span className="text-foreground">{formatCurrency(result.baseCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">दूरी ({result.distance} km)</span>
                <span className="text-foreground">{formatCurrency(result.distanceCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">लोडिंग/अनलोडिंग</span>
                <span className="text-foreground">{formatCurrency(result.loadingCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">टोल अनुमान</span>
                <span className="text-foreground">{formatCurrency(result.tollEstimate)}</span>
              </div>

              <div className="border-t border-zinc-800 pt-2 mt-2" />

              {/* Per Quintal */}
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">प्रति क्विंटल लागत</span>
                <span className="text-amber-500 font-bold">{formatCurrency(result.costPerQuintal)}/q</span>
              </div>

              {/* Estimated Time */}
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">
                  <Clock size={12} className="inline mr-1" />
                  अनुमानित समय
                </span>
                <span className="text-foreground font-medium">
                  {result.estimatedTime} घंटे
                </span>
              </div>

              {/* Trips */}
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">ट्रिप की संख्या</span>
                <span className="text-foreground font-medium">
                  {result.trips} ट्रिप ({result.vehicleCapacity}q/ट्रिप)
                </span>
              </div>
            </div>

            {/* E-way Bill Link */}
            <div className="px-4 py-3 border-t border-zinc-800">
              <Link
                to={`/eway-bill/new?distance=${result.distance}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&quantity=${weight}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/25 transition-colors"
              >
                <FileText size={14} />
                E-way Bill बनाएं
              </Link>
            </div>

            {/* Disclaimer */}
            <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800">
              <p className="text-[9px] text-zinc-600 text-center">
                * यह अनुमानित लागत है। वास्तविक लागत भिन्न हो सकती है।
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
