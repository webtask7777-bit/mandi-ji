import { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, Plus, Trash2, Save } from 'lucide-react';
import { apiFetchAuth, apiPut } from '../../api/client';
import { useToast } from '../../context/ToastContext';

const PAGE_META = {
  about: { label: 'हमारे बारे में', icon: '📖' },
  privacy: { label: 'गोपनीयता नीति', icon: '🔒' },
  terms: { label: 'नियम और शर्तें', icon: '📜' },
  contact: { label: 'संपर्क करें', icon: '📞' },
};

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

export default function AdminPages() {
  const toast = useToast();
  const [pages, setPages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(null);

  function loadPages() {
    setLoading(true);
    apiFetchAuth('/admin/pages')
      .then(data => { setPages(data); setError(''); })
      .catch(err => setError(err.message || 'पेज लोड करने में विफल'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPages(); }, []);

  function toggleExpand(key) {
    setExpanded(prev => prev === key ? null : key);
  }

  function updatePage(key, field, value) {
    setPages(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function updateSection(key, idx, field, value) {
    setPages(prev => {
      const page = { ...prev[key] };
      const sections = [...(page.sections || [])];
      sections[idx] = { ...sections[idx], [field]: value };
      return { ...prev, [key]: { ...page, sections } };
    });
  }

  function addSection(key) {
    setPages(prev => {
      const page = { ...prev[key] };
      const sections = [...(page.sections || []), { title: '', body: '' }];
      return { ...prev, [key]: { ...page, sections } };
    });
  }

  function removeSection(key, idx) {
    setPages(prev => {
      const page = { ...prev[key] };
      const sections = (page.sections || []).filter((_, i) => i !== idx);
      return { ...prev, [key]: { ...page, sections } };
    });
  }

  // Contact page FAQ helpers
  function updateFaq(idx, field, value) {
    setPages(prev => {
      const page = { ...prev.contact };
      const faqs = [...(page.faqs || [])];
      faqs[idx] = { ...faqs[idx], [field]: value };
      return { ...prev, contact: { ...page, faqs } };
    });
  }

  function addFaq() {
    setPages(prev => {
      const page = { ...prev.contact };
      const faqs = [...(page.faqs || []), { q: '', a: '' }];
      return { ...prev, contact: { ...page, faqs } };
    });
  }

  function removeFaq(idx) {
    setPages(prev => {
      const page = { ...prev.contact };
      const faqs = (page.faqs || []).filter((_, i) => i !== idx);
      return { ...prev, contact: { ...page, faqs } };
    });
  }

  async function handleSave(key) {
    setSaving(key);
    try {
      const page = pages[key];
      const body = { title: page.title, seoDescription: page.seoDescription, sections: page.sections };
      if (key === 'contact') {
        body.email = page.email;
        body.phone = page.phone;
        body.faqs = page.faqs;
      }
      const updated = await apiPut(`/admin/pages/${key}`, body);
      setPages(prev => ({ ...prev, [key]: updated }));
      toast.success('पेज सहेजा गया');
    } catch (err) {
      toast.error(err.message || 'सहेजने में विफल');
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-zinc-400 animate-pulse">लोड हो रहा है...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-red-400 mb-3">{error}</div>
        <button onClick={loadPages} className="text-xs text-green-500 hover:underline">
          पुनः प्रयास करें
        </button>
      </div>
    );
  }

  const pageKeys = Object.keys(PAGE_META);

  return (
    <div className="space-y-3">
      {pageKeys.map(key => {
        const page = pages[key] || {};
        const meta = PAGE_META[key];
        const isExpanded = expanded === key;

        return (
          <div key={key} className="rounded-xl overflow-hidden">
            {/* Card Header */}
            <div
              onClick={() => toggleExpand(key)}
              className={`bg-zinc-900 border border-zinc-800 p-4 cursor-pointer hover:border-green-500/30 transition-colors ${
                isExpanded ? 'rounded-t-xl border-b-0' : 'rounded-xl'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-sm">
                    {meta.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FileText size={13} className="text-green-400" />
                      {meta.label}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      अंतिम अपडेट: {formatDate(page.updatedAt)}
                    </div>
                  </div>
                </div>
                {isExpanded
                  ? <ChevronUp size={16} className="text-zinc-400" />
                  : <ChevronDown size={16} className="text-zinc-400" />
                }
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="bg-zinc-900 border border-zinc-800 border-t-0 rounded-b-xl p-4 space-y-4">
                {/* Title */}
                <div>
                  <label className="text-[10px] text-zinc-500 font-medium mb-1 block">शीर्षक</label>
                  <input
                    type="text"
                    value={page.title || ''}
                    onChange={e => updatePage(key, 'title', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
                    placeholder="पेज शीर्षक"
                  />
                </div>

                {/* SEO Description */}
                <div>
                  <label className="text-[10px] text-zinc-500 font-medium mb-1 block">SEO विवरण</label>
                  <input
                    type="text"
                    value={page.seoDescription || ''}
                    onChange={e => updatePage(key, 'seoDescription', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
                    placeholder="SEO विवरण"
                  />
                </div>

                {/* Contact page extra fields */}
                {key === 'contact' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-medium mb-1 block">ईमेल</label>
                      <input
                        type="email"
                        value={page.email || ''}
                        onChange={e => updatePage(key, 'email', e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
                        placeholder="contact@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-medium mb-1 block">फ़ोन</label>
                      <input
                        type="tel"
                        value={page.phone || ''}
                        onChange={e => updatePage(key, 'phone', e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                  </div>
                )}

                {/* Sections */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] text-zinc-500 font-medium">अनुभाग ({(page.sections || []).length})</label>
                    <button
                      onClick={() => addSection(key)}
                      className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 transition-colors"
                    >
                      <Plus size={12} />
                      अनुभाग जोड़ें
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(page.sections || []).map((section, idx) => (
                      <div key={idx} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={section.title || ''}
                            onChange={e => updateSection(key, idx, 'title', e.target.value)}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
                            placeholder="अनुभाग शीर्षक"
                          />
                          <button
                            onClick={() => removeSection(key, idx)}
                            className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-red-500/15 hover:text-red-400 text-zinc-500 transition-colors shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <textarea
                          value={section.body || ''}
                          onChange={e => updateSection(key, idx, 'body', e.target.value)}
                          rows={4}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors resize-none"
                          placeholder="अनुभाग सामग्री"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact page FAQs */}
                {key === 'contact' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] text-zinc-500 font-medium">FAQs ({(page.faqs || []).length})</label>
                      <button
                        onClick={addFaq}
                        className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 transition-colors"
                      >
                        <Plus size={12} />
                        FAQ जोड़ें
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(page.faqs || []).map((faq, idx) => (
                        <div key={idx} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <textarea
                              value={faq.q || ''}
                              onChange={e => updateFaq(idx, 'q', e.target.value)}
                              rows={2}
                              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors resize-none"
                              placeholder="प्रश्न"
                            />
                            <button
                              onClick={() => removeFaq(idx)}
                              className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-red-500/15 hover:text-red-400 text-zinc-500 transition-colors shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <textarea
                            value={faq.a || ''}
                            onChange={e => updateFaq(idx, 'a', e.target.value)}
                            rows={2}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors resize-none"
                            placeholder="उत्तर"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={() => handleSave(key)}
                  disabled={saving === key}
                  className="flex items-center gap-2 bg-green-500 text-green-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-green-400 transition-colors disabled:opacity-50 active:scale-[0.98]"
                >
                  <Save size={13} />
                  {saving === key ? 'सहेजा जा रहा है...' : 'सहेजें'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
