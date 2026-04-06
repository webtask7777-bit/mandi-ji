import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiFetchAuth, apiPost, apiPut, apiDelete } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';

const TYPE_COLORS = {
  info: 'bg-blue-500/15 text-blue-500 border border-blue-500/30',
  warning: 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
  alert: 'bg-red-500/15 text-red-500 border border-red-500/30',
  promo: 'bg-green-500/15 text-green-500 border border-green-500/30',
};

const TYPE_LABELS = {
  info: 'जानकारी',
  warning: 'चेतावनी',
  alert: 'अलर्ट',
  promo: 'प्रोमो',
};

const FILTER_TABS = [
  { key: 'all', label: 'सभी' },
  { key: 'active', label: 'सक्रिय' },
  { key: 'expired', label: 'समाप्त' },
];

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
  title: '',
  message: '',
  type: 'info',
  target: 'all',
  targetState: '',
  expiresAt: '',
};

export default function AdminNotifications() {
  const toast = useToast();
  const confirm = useConfirm();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  function loadNotifications() {
    setLoading(true);
    apiFetchAuth('/admin/notifications')
      .then(data => { setNotifications(data); setError(''); })
      .catch(err => setError(err.message || 'सूचनाएं लोड करने में विफल'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadNotifications(); }, []);

  function openNewForm() {
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm({ ...EMPTY_FORM });
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
        type: form.type,
        target: form.target,
        expiresAt: form.expiresAt || null,
      };
      if (form.target === 'state' && form.targetState.trim()) {
        body.targetState = form.targetState.trim();
      }

      const created = await apiPost('/admin/notifications', body);
      setNotifications(prev => [created, ...prev]);
      toast.success('सूचना बनाई गई');
      closeForm();
    } catch (err) {
      toast.error(err.message || 'सहेजने में विफल');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(notif) {
    try {
      const updated = await apiPut(`/admin/notifications/${notif.id}`, { active: !notif.active });
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, ...updated } : n));
      toast.success(updated.active ? 'सूचना सक्रिय की गई' : 'सूचना निष्क्रिय की गई');
    } catch (err) {
      toast.error(err.message || 'स्थिति बदलने में विफल');
    }
  }

  async function handleDelete(id) {
    const ok = await confirm('सूचना हटाएं?', 'क्या आप यह सूचना हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।');
    if (!ok) return;
    try {
      await apiDelete(`/admin/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('सूचना हटा दी गई');
    } catch (err) {
      toast.error(err.message || 'हटाने में विफल');
    }
  }

  function isActive(n) {
    return n.active && (!n.expiresAt || new Date(n.expiresAt) > new Date());
  }

  function isExpired(n) {
    return n.expiresAt && new Date(n.expiresAt) < new Date();
  }

  let filtered = notifications;
  if (filter === 'active') filtered = filtered.filter(n => isActive(n));
  if (filter === 'expired') filtered = filtered.filter(n => isExpired(n));

  function getFilterCount(key) {
    if (key === 'all') return notifications.length;
    if (key === 'active') return notifications.filter(n => isActive(n)).length;
    if (key === 'expired') return notifications.filter(n => isExpired(n)).length;
    return 0;
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
          <Bell size={15} className="text-green-400" />
          सूचना प्रबंधन
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-1.5 bg-green-500 text-green-950 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-green-400 transition-colors active:scale-[0.98]"
        >
          <Plus size={13} />
          नई सूचना
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === tab.key
                ? 'bg-green-500 text-green-950 font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {tab.label}
            <span className="ml-1 text-[10px] opacity-70">
              ({getFilterCount(tab.key)})
            </span>
          </button>
        ))}
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
            <span className="text-xs font-bold text-foreground">नई सूचना बनाएं</span>
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
              placeholder="सूचना शीर्षक"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-[10px] text-zinc-500 font-medium mb-1 block">संदेश</label>
            <textarea
              value={form.message}
              onChange={e => updateForm('message', e.target.value)}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors resize-none"
              placeholder="सूचना संदेश"
            />
          </div>

          {/* Type & Target row */}
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
                <option value="alert">अलर्ट (Alert)</option>
                <option value="promo">प्रोमो (Promo)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-medium mb-1 block">लक्ष्य</label>
              <select
                value={form.target}
                onChange={e => updateForm('target', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
              >
                <option value="all">सभी</option>
                <option value="state">राज्य</option>
              </select>
            </div>
          </div>

          {/* Target State (conditional) */}
          {form.target === 'state' && (
            <div>
              <label className="text-[10px] text-zinc-500 font-medium mb-1 block">राज्य का नाम</label>
              <input
                type="text"
                value={form.targetState}
                onChange={e => updateForm('targetState', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
                placeholder="राज्य का नाम दर्ज करें"
              />
            </div>
          )}

          {/* Expires At */}
          <div>
            <label className="text-[10px] text-zinc-500 font-medium mb-1 block">समाप्ति तिथि</label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={e => updateForm('expiresAt', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-green-500 text-green-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-green-400 transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {submitting ? 'सहेजा जा रहा है...' : 'सूचना बनाएं'}
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

      {/* Notifications List */}
      <div className="space-y-2">
        {filtered.map(notif => (
          <div
            key={notif.id}
            className={`bg-zinc-900 border rounded-xl p-3 ${
              isExpired(notif) ? 'border-zinc-800 opacity-60' : 'border-zinc-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-sm font-semibold text-foreground truncate">{notif.title}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${TYPE_COLORS[notif.type] || TYPE_COLORS.info}`}>
                    {TYPE_LABELS[notif.type] || notif.type}
                  </span>
                  {isExpired(notif) && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-700 text-zinc-400">
                      समाप्त
                    </span>
                  )}
                </div>
                {notif.message && (
                  <div className="text-[11px] text-zinc-400 mb-1 line-clamp-2">{notif.message}</div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-zinc-500">
                    लक्ष्य: {notif.target === 'state' ? `राज्य — ${notif.targetState || ''}` : 'सभी'}
                  </span>
                  {notif.expiresAt && (
                    <span className="text-[10px] text-zinc-500">
                      समाप्ति: {formatDate(notif.expiresAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleToggleActive(notif)}
                  title={notif.active ? 'निष्क्रिय करें' : 'सक्रिय करें'}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    notif.active
                      ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                      : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                  }`}
                >
                  {notif.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                </button>
                <button
                  onClick={() => handleDelete(notif.id)}
                  title="हटाएं"
                  className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-red-500/15 hover:text-red-400 text-zinc-500 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-zinc-500">
            कोई सूचना नहीं मिली
          </div>
        )}
      </div>
    </div>
  );
}
