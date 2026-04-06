import { useState, useEffect } from 'react';
import { Megaphone, Plus, PenLine, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiFetchAuth, apiPost, apiPut, apiDelete } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';

const TYPE_COLORS = {
  info: 'bg-blue-500/15 text-blue-500 border border-blue-500/30',
  warning: 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
  promo: 'bg-green-500/15 text-green-500 border border-green-500/30',
  success: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30',
};

const TYPE_LABELS = {
  info: 'जानकारी',
  warning: 'चेतावनी',
  promo: 'प्रोमो',
  success: 'सफलता',
};

const EMPTY_FORM = {
  title: '',
  message: '',
  link: '',
  type: 'info',
  order: 0,
};

export default function AdminBanners() {
  const toast = useToast();
  const confirm = useConfirm();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function loadBanners() {
    setLoading(true);
    apiFetchAuth('/admin/banners')
      .then(data => { setBanners(data); setError(''); })
      .catch(err => setError(err.message || 'बैनर लोड करने में विफल'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadBanners(); }, []);

  function openNewForm() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(banner) {
    setForm({
      title: banner.title || '',
      message: banner.message || '',
      link: banner.link || '',
      type: banner.type || 'info',
      order: banner.order ?? 0,
    });
    setEditingId(banner.id);
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
    if (!form.title.trim()) {
      toast.error('शीर्षक आवश्यक है');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        title: form.title.trim(),
        message: form.message.trim(),
        link: form.link.trim(),
        type: form.type,
        order: Number(form.order) || 0,
      };

      if (editingId) {
        const updated = await apiPut(`/admin/banners/${editingId}`, body);
        setBanners(prev => prev.map(b => b.id === editingId ? { ...b, ...updated } : b));
        toast.success('बैनर अपडेट हो गया');
      } else {
        const created = await apiPost('/admin/banners', body);
        setBanners(prev => [created, ...prev]);
        toast.success('बैनर बनाया गया');
      }
      closeForm();
    } catch (err) {
      toast.error(err.message || 'सहेजने में विफल');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(banner) {
    try {
      const updated = await apiPut(`/admin/banners/${banner.id}`, { active: !banner.active });
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, ...updated } : b));
      toast.success(updated.active ? 'बैनर सक्रिय किया गया' : 'बैनर निष्क्रिय किया गया');
    } catch (err) {
      toast.error(err.message || 'स्थिति बदलने में विफल');
    }
  }

  async function handleDelete(id) {
    const ok = await confirm('बैनर हटाएं?', 'क्या आप यह बैनर हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।');
    if (!ok) return;
    try {
      await apiDelete(`/admin/banners/${id}`);
      setBanners(prev => prev.filter(b => b.id !== id));
      if (editingId === id) closeForm();
      toast.success('बैनर हटा दिया गया');
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
          <Megaphone size={15} className="text-green-400" />
          बैनर प्रबंधन
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-1.5 bg-green-500 text-green-950 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-green-400 transition-colors active:scale-[0.98]"
        >
          <Plus size={13} />
          नया बैनर
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
              {editingId ? 'बैनर संपादित करें' : 'नया बैनर बनाएं'}
            </span>
            <button
              type="button"
              onClick={closeForm}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              रद्द करें
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="text-[10px] text-zinc-500 font-medium mb-1 block">शीर्षक *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => updateForm('title', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
              placeholder="बैनर शीर्षक"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-[10px] text-zinc-500 font-medium mb-1 block">संदेश</label>
            <textarea
              value={form.message}
              onChange={e => updateForm('message', e.target.value)}
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors resize-none"
              placeholder="बैनर संदेश"
            />
          </div>

          {/* Link */}
          <div>
            <label className="text-[10px] text-zinc-500 font-medium mb-1 block">लिंक (वैकल्पिक)</label>
            <input
              type="text"
              value={form.link}
              onChange={e => updateForm('link', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
              placeholder="https://..."
            />
          </div>

          {/* Type & Order row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 font-medium mb-1 block">प्रकार</label>
              <select
                value={form.type}
                onChange={e => updateForm('type', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
              >
                <option value="info">जानकारी (Info)</option>
                <option value="warning">चेतावनी (Warning)</option>
                <option value="promo">प्रोमो (Promo)</option>
                <option value="success">सफलता (Success)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-medium mb-1 block">क्रम</label>
              <input
                type="number"
                value={form.order}
                onChange={e => updateForm('order', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
                placeholder="0"
              />
            </div>
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
                : editingId ? 'अपडेट करें' : 'बैनर बनाएं'
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

      {/* Banners List */}
      <div className="space-y-2">
        {banners.map(banner => (
          <div
            key={banner.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-sm font-semibold text-foreground truncate">{banner.title}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${TYPE_COLORS[banner.type] || TYPE_COLORS.info}`}>
                    {TYPE_LABELS[banner.type] || banner.type}
                  </span>
                </div>
                {banner.message && (
                  <div className="text-[11px] text-zinc-400 mb-1 line-clamp-2">{banner.message}</div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {banner.link && (
                    <span className="text-[10px] text-green-400 truncate max-w-[200px]">{banner.link}</span>
                  )}
                  <span className="text-[10px] text-zinc-500">क्रम: {banner.order ?? 0}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleToggleActive(banner)}
                  title={banner.active ? 'निष्क्रिय करें' : 'सक्रिय करें'}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    banner.active
                      ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                      : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                  }`}
                >
                  {banner.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                </button>
                <button
                  onClick={() => openEditForm(banner)}
                  title="संपादित करें"
                  className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-green-500/15 hover:text-green-400 text-zinc-500 transition-colors"
                >
                  <PenLine size={12} />
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  title="हटाएं"
                  className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-red-500/15 hover:text-red-400 text-zinc-500 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <div className="text-center py-8 text-sm text-zinc-500">
            कोई बैनर नहीं मिला
          </div>
        )}
      </div>
    </div>
  );
}
