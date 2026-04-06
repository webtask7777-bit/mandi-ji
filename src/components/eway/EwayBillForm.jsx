import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, FileText, Check } from 'lucide-react';
import { apiPost } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import EwayBillPreview from './EwayBillPreview';

const STEPS = [
  { label: 'आपूर्ति विवरण', icon: '1' },
  { label: 'भेजने वाला', icon: '2' },
  { label: 'प्राप्तकर्ता', icon: '3' },
  { label: 'सामान विवरण', icon: '4' },
  { label: 'परिवहन', icon: '5' },
  { label: 'पूर्वावलोकन', icon: '6' },
];

// Common HSN codes for agricultural products
const CROP_HSN = {
  'धान': '1006',
  'चावल': '1006',
  'गेहूँ': '1001',
  'मक्का': '1005',
  'चना': '0713',
  'सोयाबीन': '1201',
  'दाल': '0713',
  'सरसों': '1205',
  'प्याज': '0703',
  'आलू': '0701',
  'टमाटर': '0702',
};

const initialForm = {
  supplyType: 'outward',
  docNumber: '',
  docDate: new Date().toISOString().slice(0, 10),
  fromName: '',
  fromGstin: '',
  fromAddress: '',
  fromState: '',
  fromPincode: '',
  toName: '',
  toGstin: '',
  toAddress: '',
  toState: '',
  toPincode: '',
  cropName: '',
  hsnCode: '',
  quantity: '',
  unit: 'QTL',
  value: '',
  transportMode: 'road',
  vehicleNumber: '',
  distance: '',
};

export default function EwayBillForm() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [generatedBill, setGeneratedBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateField(key, value) {
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      // Auto-fill HSN when crop name matches
      if (key === 'cropName') {
        const hsn = CROP_HSN[value.trim()];
        if (hsn) updated.hsnCode = hsn;
      }
      return updated;
    });
  }

  function canGoNext() {
    switch (step) {
      case 0: return form.supplyType && form.docDate;
      case 1: return form.fromName.trim();
      case 2: return form.toName.trim();
      case 3: return form.cropName.trim() && form.quantity && form.value;
      case 4: return form.transportMode;
      case 5: return true;
      default: return true;
    }
  }

  function handleNext() {
    if (step < 5) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  async function handleGenerate() {
    setError('');
    setLoading(true);
    try {
      const bill = await apiPost('/eway-bill/generate', form);
      toast.success('E-way Bill बन गया!');
      setGeneratedBill(bill);
    } catch (err) {
      setError(err.message || 'E-way Bill जनरेट करने में विफल');
    } finally {
      setLoading(false);
    }
  }

  // If bill generated, show it
  if (generatedBill) {
    return <EwayBillPreview bill={generatedBill} />;
  }

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-600 focus:border-green-500 focus:outline-none transition-colors";
  const labelClass = "block text-xs font-medium text-zinc-400 mb-1.5";

  return (
    <div className="space-y-4">
      {/* Step Indicator */}
      <div className="flex items-center justify-between px-1">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center">
            <button
              onClick={() => i < step && setStep(i)}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i === step
                  ? 'bg-green-500 text-green-950'
                  : i < step
                    ? 'bg-green-500/20 text-green-500 cursor-pointer'
                    : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {i < step ? <Check size={12} /> : s.icon}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-4 sm:w-6 h-0.5 ${i < step ? 'bg-green-500/30' : 'bg-zinc-800'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Title */}
      <div className="text-center">
        <div className="text-sm font-bold text-foreground">{STEPS[step].label}</div>
        <div className="text-[10px] text-zinc-500">चरण {step + 1} / {STEPS.length}</div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {/* Step 1: Supply Details */}
          {step === 0 && (
            <>
              <div>
                <label className={labelClass}>आपूर्ति प्रकार</label>
                <div className="flex gap-3">
                  {[
                    { value: 'outward', label: 'बाहर जाने वाला (Outward)' },
                    { value: 'inward', label: 'अंदर आने वाला (Inward)' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateField('supplyType', opt.value)}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                        form.supplyType === opt.value
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>दस्तावेज़ नंबर</label>
                <input
                  type="text"
                  value={form.docNumber}
                  onChange={e => updateField('docNumber', e.target.value)}
                  placeholder="INV-2026-001"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>दस्तावेज़ तिथि</label>
                <input
                  type="date"
                  value={form.docDate}
                  onChange={e => updateField('docDate', e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Step 2: From (Sender) */}
          {step === 1 && (
            <>
              <div>
                <label className={labelClass}>भेजने वाले का नाम *</label>
                <input
                  type="text"
                  value={form.fromName}
                  onChange={e => updateField('fromName', e.target.value)}
                  placeholder="नाम दर्ज करें"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>GSTIN (वैकल्पिक)</label>
                <input
                  type="text"
                  value={form.fromGstin}
                  onChange={e => updateField('fromGstin', e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>पता</label>
                <input
                  type="text"
                  value={form.fromAddress}
                  onChange={e => updateField('fromAddress', e.target.value)}
                  placeholder="पूरा पता"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>राज्य</label>
                  <input
                    type="text"
                    value={form.fromState}
                    onChange={e => updateField('fromState', e.target.value)}
                    placeholder="छत्तीसगढ़"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>पिनकोड</label>
                  <input
                    type="text"
                    value={form.fromPincode}
                    onChange={e => updateField('fromPincode', e.target.value)}
                    placeholder="492001"
                    maxLength={6}
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 3: To (Receiver) */}
          {step === 2 && (
            <>
              <div>
                <label className={labelClass}>प्राप्तकर्ता का नाम *</label>
                <input
                  type="text"
                  value={form.toName}
                  onChange={e => updateField('toName', e.target.value)}
                  placeholder="नाम दर्ज करें"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>GSTIN (वैकल्पिक)</label>
                <input
                  type="text"
                  value={form.toGstin}
                  onChange={e => updateField('toGstin', e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>पता</label>
                <input
                  type="text"
                  value={form.toAddress}
                  onChange={e => updateField('toAddress', e.target.value)}
                  placeholder="पूरा पता"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>राज्य</label>
                  <input
                    type="text"
                    value={form.toState}
                    onChange={e => updateField('toState', e.target.value)}
                    placeholder="मध्य प्रदेश"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>पिनकोड</label>
                  <input
                    type="text"
                    value={form.toPincode}
                    onChange={e => updateField('toPincode', e.target.value)}
                    placeholder="462001"
                    maxLength={6}
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Item Details */}
          {step === 3 && (
            <>
              <div>
                <label className={labelClass}>फसल / सामान का नाम *</label>
                <input
                  type="text"
                  value={form.cropName}
                  onChange={e => updateField('cropName', e.target.value)}
                  placeholder="जैसे: धान, गेहूँ, चना"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>HSN कोड</label>
                <input
                  type="text"
                  value={form.hsnCode}
                  onChange={e => updateField('hsnCode', e.target.value)}
                  placeholder="स्वतः भरेगा"
                  className={inputClass}
                />
                <p className="text-[9px] text-zinc-600 mt-1">फसल का नाम हिंदी में लिखने पर HSN स्वतः भरेगा</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>मात्रा *</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={e => updateField('quantity', e.target.value)}
                    placeholder="50"
                    min="1"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>इकाई</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={e => updateField('unit', e.target.value)}
                    placeholder="QTL"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>कुल मूल्य (रुपये) *</label>
                <input
                  type="number"
                  value={form.value}
                  onChange={e => updateField('value', e.target.value)}
                  placeholder="100000"
                  min="1"
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Step 5: Transport */}
          {step === 4 && (
            <>
              <div>
                <label className={labelClass}>परिवहन का माध्यम</label>
                <div className="flex gap-3">
                  {[
                    { value: 'road', label: 'सड़क (Road)' },
                    { value: 'rail', label: 'रेल (Rail)' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateField('transportMode', opt.value)}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                        form.transportMode === opt.value
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>वाहन नंबर</label>
                <input
                  type="text"
                  value={form.vehicleNumber}
                  onChange={e => updateField('vehicleNumber', e.target.value.toUpperCase())}
                  placeholder="CG04XX1234"
                  className={inputClass}
                />
                <p className="text-[9px] text-zinc-600 mt-1">भारतीय वाहन नंबर प्रारूप</p>
              </div>
              <div>
                <label className={labelClass}>दूरी (किलोमीटर)</label>
                <input
                  type="number"
                  value={form.distance}
                  onChange={e => updateField('distance', e.target.value)}
                  placeholder="150"
                  min="1"
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Step 6: Preview */}
          {step === 5 && (
            <div className="space-y-3">
              <EwayBillPreview
                bill={{
                  billNumber: 'पूर्वावलोकन',
                  supplyType: form.supplyType,
                  docNumber: form.docNumber,
                  docDate: form.docDate,
                  from: {
                    name: form.fromName,
                    gstin: form.fromGstin,
                    address: form.fromAddress,
                    state: form.fromState,
                    pincode: form.fromPincode,
                  },
                  to: {
                    name: form.toName,
                    gstin: form.toGstin,
                    address: form.toAddress,
                    state: form.toState,
                    pincode: form.toPincode,
                  },
                  items: [{
                    cropName: form.cropName,
                    hsnCode: form.hsnCode,
                    quantity: Number(form.quantity) || 0,
                    unit: form.unit,
                    value: Number(form.value) || 0,
                  }],
                  transport: {
                    mode: form.transportMode,
                    vehicleNumber: form.vehicleNumber,
                    distance: Number(form.distance) || 0,
                  },
                  totalValue: Number(form.value) || 0,
                  validFrom: new Date().toISOString(),
                  validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                  status: 'preview',
                }}
                isPreview
              />

              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 text-green-950 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="animate-pulse">जनरेट हो रहा है...</span>
                ) : (
                  <>
                    <FileText size={16} />
                    जनरेट करें
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      {step < 5 && (
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium py-2.5 rounded-xl transition-colors hover:bg-zinc-800 flex items-center justify-center gap-1 text-sm"
            >
              <ChevronLeft size={14} />
              पीछे
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canGoNext()}
            className="flex-1 bg-green-500 hover:bg-green-600 text-green-950 font-bold py-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-sm"
          >
            आगे
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
