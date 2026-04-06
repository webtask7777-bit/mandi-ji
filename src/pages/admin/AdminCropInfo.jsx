import { useState, useEffect } from 'react';
import { Sprout, Plus, PenLine, Trash2 } from 'lucide-react';
import { apiFetchAuth, apiPost, apiPut, apiDelete } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';

function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    return new Date(isoStr).toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

const EMPTY_FORM = {
  cropId: '',
  growingTips: '',
  marketTrends: '',
  storageAdvice: '',
  seasonalInfo: '',
};

export default function AdminCropInfo() {
  const toast = useToast();
  const confirm = useConfirm();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function loadEntries() {
    setLoading(true);
    apiFetchAuth('/admin/crop-info')
      .then(data => { setEntries(data); setError(''); })
      .catch(err => setError(err.message || 'फसल जानकारी लोड करने में विफल'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadEntries(); }, []);

  function openNewForm() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(entry) {
    setForm({
      cropId: entry.cropId || '',
      growingTips: entry.growingTips || '',
      marketTrends: entry.marketTrends || '',
      storageAdvice: entry.storageAdvice || '',
      seasonalInfo: entry.seasonalInfo || '',
    });
    setEditingId(entry.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  }

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.cropId.trim()) {
      toast.error('फसल ID आवश्यक है');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        cropId: form.cropId.trim(),
        growingTips: form.growingTips.trim(),
        marketTrends: form.marketTrends.trim(),
        storageAdvice: form.storageAdvice.trim(),
        seasonalInfo: form.seasonalInfo.trim(),
      };

      if (editingId) {
        const updated = await apiPut(`/admin/crop-info/${editingId}`, body);
        setEntries(prev => prev.map(e => e.id === editingId ? { ...e, ...updated } : e));
        toast.success('फसल जानकारी अपडेट हो गई');
      } else {
        const created = await apiPost('/admin/crop-info', body);
        setEntries(prev => [created, ...prev]);
        toast.success('फसल जानकारी जोड़ी गई');
      }
      closeForm();
    } catch (err) {
      toast.error(err.message || 'सहेजने में विफल');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm('फसल जानकारी हटाएं?', 'क्या आप यह जानकारी हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।');
    if (!ok) return;
    try {
      await apiDelete(`/admin/crop-info/${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
      if (editingId === id) closeForm();
      toast.success('फसल जानकारी हटा दी गई');
    } catch (err) {
      toast.error(err.message || 'हटाने में विफल');
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-zinc-400 animate-pulse">लोड हो रहा है...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Sprout size={15} className="text-green-400" />
          फसल जानकारी प्रबंधन
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-1.5 bg-green-500 text-green-950 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-green-400 transition-colors active:scale-[0.98]"
        >
          <Plus size={13} />
          फसल जानकारी जोड़ें
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Inline Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-foreground">
              {editingId ? 'फसल जानकारी संपादित करें' : 'नई फसल जानकारी जोड़ें'}
            </span>
            <button
              type="button"
              onClick={closeForm}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              रद्द करें
            </button>
          </div>

          {/* Crop ID */}
          <div>
            <label className="text-[10px] text-zinc-500 font-medium mb-1 block">फसल ID *</label>
            <input
              type="text"
              value={form.cropId}
              onChange={e => updateForm('cropId', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
              placeholder="wheat, rice, tomato..."
              required
            />
          </div>

          {/* Growing Tips */}
          <div>
            <label className="text-[10px] text-zinc-500 font-medium mb-1 block">खेती टिप्स</label>
            <textarea
              value={form.growingTips}
              onChange={e => updateForm('growingTips', e.target.value)}
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors resize-none"
              placeholder="फसल उगाने के टिप्स..."
            />
          </div>

          {/* Market Trends */}
          <div>
            <label className="text-[10px] text-zinc-500 font-medium mb-1 block">बाज़ार रुझान</label>
            <textarea
              value={form.marketTrends}
              onChange={e => updateForm('marketTrends', e.target.value)}
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors resize-none"
              placeholder="बाज़ार रुझान की जानकारी..."
            />
          </div>

          {/* Storage Advice */}
          <div>
            <label className="text-[10px] text-zinc-500 font-medium mb-1 block">भंडारण सलाह</label>
            <textarea
              value={form.storageAdvice}
              onChange={e => updateForm('storageAdvice', e.target.value)}
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors resize-none"
              placeholder="भंडारण सलाह..."
            />
          </div>

          {/* Seasonal Info */}
          <div>
            <label className="text-[10px] text-zinc-500 font-medium mb-1 block">मौसमी जानकारी</label>
            <textarea
              value={form.seasonalInfo}
              onChange={e => updateForm('seasonalInfo', e.target.value)}
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors resize-none"
              placeholder="मौसमी जानकारी..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-green-500 text-green-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-green-400 transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {submitting
                ? 'सहेजा जा रहा है...'
                : editingId ? 'अपडेट करें' : 'जानकारी जोड़ें'
              }
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors active:scale-[0.98]"
            >
              रद्द करें
            </button>
          </div>
        </form>
      )}

      {/* Entries List */}
      <div className="space-y-2">
        {entries.map(entry => (
          <div
            key={entry.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <Sprout size={13} className="text-green-400 shrink-0" />
                  <span className="text-sm font-semibold text-foreground truncate">{entry.cropId}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-[10px] text-zinc-500">अंतिम अपडेट: {formatDate(entry.updatedAt)}</span>
                </div>
                {entry.growingTips && (
                  <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                    <span className="text-zinc-500 font-medium">खेती टिप्स:</span> {entry.growingTips}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => openEditForm(entry)}
                  title="संपादित करें"
                  className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-green-500/15 hover:text-green-400 text-zinc-500 transition-colors"
                >
                  <PenLine size={12} />
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  title="हटाएं"
                  className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-red-500/15 hover:text-red-400 text-zinc-500 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="text-center py-8 text-sm text-zinc-500">
            कोई फसल जानकारी नहीं मिली
          </div>
        )}
      </div>
    </div>
  );
}
