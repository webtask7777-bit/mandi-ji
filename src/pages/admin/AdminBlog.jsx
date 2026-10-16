import { useState, useEffect, useCallback } from 'react';
import { PenLine, Trash2, Plus, Search, BookOpen, ExternalLink, Download } from 'lucide-react';
import { apiFetchAuth, apiPost, apiPut, apiDelete } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { STATE_NAMES } from '../../context/StateContext';
import { CROP_TOPICS } from '../../../shared/cropTopics.js';

const LANGUAGES = { hi: 'हिन्दी', mr: 'मराठी', gu: 'ગુજરાતી' };
const FILTER_TABS = [
  { key: 'all', label: 'सभी' },
  { key: 'draft', label: 'ड्राफ़्ट' },
  { key: 'published', label: 'प्रकाशित' },
];
const INPUT = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500 transition-colors';
const BUTTON = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 disabled:opacity-50';
const SERVER_FIELDS = ['id', 'createdAt', 'updatedAt', 'publishedAt', 'reviewedAt', 'reviewer', 'reviewedBy', 'author', 'authorType'];
const DERIVED_FIELDS = ['relatedPosts', 'translations'];

function emptyForm() {
  return {
    title: '', slug: '', excerpt: '', content: '', tags: '', status: 'draft', category: '',
    language: 'hi', cropTopics: [], stateIds: [], regionLabel: '', translationGroup: '',
    weatherRelevant: false, sources: [], coverImage: '', coverAlt: '', coverCaption: '',
    takeaways: '', relatedSlugs: '', editorialNote: '', readingMinutes: '',
    seoTitle: '', seoDescription: '',
  };
}

function toLines(value) {
  return Array.isArray(value) ? value.join('\n') : (value || '');
}

function fromLines(value) {
  return [...new Set(value.split('\n').map(item => item.trim()).filter(Boolean))];
}

function formForPost(post) {
  return {
    ...emptyForm(), ...post,
    tags: Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || ''),
    takeaways: toLines(post.takeaways), relatedSlugs: toLines(post.relatedSlugs),
    cropTopics: [...(post.cropTopics || [])], stateIds: [...(post.stateIds || [])],
    sources: (post.sources || []).map(source => ({ ...source })),
    language: post.language || 'hi', translationGroup: post.translationGroup || '',
  };
}

function editorialPayload(form) {
  const body = {
    ...form,
    title: form.title.trim(), slug: form.slug.trim(), excerpt: form.excerpt.trim(),
    tags: [...new Set(form.tags.split(',').map(tag => tag.trim()).filter(Boolean))],
    takeaways: fromLines(form.takeaways), relatedSlugs: fromLines(form.relatedSlugs),
    translationGroup: form.translationGroup.trim() || null,
    sources: form.sources.map(source => ({ ...source, title: (source.title || '').trim(), url: (source.url || '').trim() })),
    readingMinutes: form.readingMinutes === '' ? undefined : Number(form.readingMinutes),
  };
  for (const field of [...SERVER_FIELDS, ...DERIVED_FIELDS]) delete body[field];
  return body;
}

function formatDate(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('hi-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
}

function Field({ label, children, hint }) {
  return <label className="block space-y-1.5">
    <span className="block text-xs font-medium text-zinc-300">{label}</span>
    {children}
    {hint && <span className="block text-xs leading-relaxed text-zinc-400">{hint}</span>}
  </label>;
}

export default function AdminBlog() {
  const toast = useToast();
  const confirm = useConfirm();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [slugManual, setSlugManual] = useState(false);

  const loadPosts = useCallback(() => {
    setLoading(true);
    apiFetchAuth('/admin/blog')
      .then(data => { setPosts(data); setError(''); })
      .catch(err => setError(err.message || 'ब्लॉग पोस्ट लोड करने में विफल'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  function openNewForm() {
    setForm(emptyForm());
    setEditingId(null);
    setSlugManual(false);
    setFormError('');
    setShowForm(true);
  }

  function openEditForm(post) {
    // Keep optional metadata that this editor does not yet expose (for example priceLinks).
    setForm(formForPost(post));
    setEditingId(post.id);
    setSlugManual(true);
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    if (submitting) return;
    setShowForm(false);
    setForm(emptyForm());
    setEditingId(null);
    setSlugManual(false);
    setFormError('');
  }

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleSelection(field, value) {
    setForm(prev => ({ ...prev, [field]: prev[field].includes(value)
      ? prev[field].filter(item => item !== value) : [...prev[field], value] }));
  }

  function updateSource(index, field, value) {
    setForm(prev => ({ ...prev, sources: prev.sources.map((source, i) => i === index ? { ...source, [field]: value } : source) }));
  }

  function validateBasicFields() {
    if (!form.title.trim() || !/^[\p{L}\p{M}\p{N}]+(?:-[\p{L}\p{M}\p{N}]+)*$/u.test(form.slug.trim())) {
      setFormError('शीर्षक और अक्षरों, अंकों व hyphen वाला URL slug भरें। उदाहरण: dhan-bhandaran-guide');
      return false;
    }
    return true;
  }

  function downloadJson() {
    setFormError('');
    if (!validateBasicFields()) return;
    try {
      const existing = posts.find(post => post.id === editingId);
      const now = new Date().toISOString();
      const body = editorialPayload(form);
      // Export never publishes a new guide or changes an existing publication status.
      body.status = existing?.status || 'draft';
      const original = existing ? editorialPayload(formForPost(existing)) : null;
      const changed = !original || [...new Set([...Object.keys(body), ...Object.keys(original)])]
        .some(field => JSON.stringify(body[field]) !== JSON.stringify(original[field]));
      const post = {
        ...body,
        id: existing?.id || form.id || `editorial-${crypto.randomUUID()}`,
        author: 'सही भाव संपादकीय', authorType: 'Organization',
        createdAt: existing?.createdAt || form.createdAt || now,
        updatedAt: changed ? now : existing.updatedAt,
        publishedAt: existing?.publishedAt || null,
      };
      const url = URL.createObjectURL(new Blob([`${JSON.stringify(post, null, 2)}\n`], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${post.slug}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      // Retain the identity of an unsaved draft across repeated downloads.
      if (!existing) setForm(prev => ({ ...prev, id: post.id, createdAt: post.createdAt }));
      toast.success('JSON डाउनलोड शुरू हुआ। वेबसाइट पर प्रकाशन नहीं हुआ है।');
    } catch (err) {
      setFormError(err.message || 'JSON डाउनलोड नहीं हो सका।');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (!validateBasicFields()) return;
    setSubmitting(true);
    try {
      // Timestamps and the organisation byline are owned by the publishing service.
      const body = editorialPayload(form);
      if (editingId) {
        const updated = await apiPut(`/admin/blog/${editingId}`, body);
        setPosts(prev => prev.map(post => post.id === editingId ? { ...post, ...updated } : post));
      } else {
        const created = await apiPost('/admin/blog', body);
        setPosts(prev => [created, ...prev]);
      }
      toast.success('CMS में लेख सहेज दिया गया। Production के लिए source update और deployment आवश्यक है।');
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      setSlugManual(false);
    } catch (err) {
      const details = Array.isArray(err.details) ? err.details.map(item => typeof item === 'string' ? item : item.message || JSON.stringify(item)).join('\n') : '';
      setFormError([err.message || 'सहेजने में विफल', details].filter(Boolean).join('\n'));
      toast.error('लेख सहेजा नहीं गया। फॉर्म में दिए सुधार देखें।');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!await confirm('पोस्ट हटाएं?', 'क्या आप यह पोस्ट हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।')) return;
    try {
      await apiDelete(`/admin/blog/${id}`);
      setPosts(prev => prev.filter(post => post.id !== id));
      if (editingId === id) closeForm();
      toast.success('पोस्ट हटा दी गई');
    } catch (err) {
      toast.error(err.message || 'हटाने में विफल');
    }
  }

  const filtered = posts.filter(post =>
    (filter === 'all' || post.status === filter)
    && (!languageFilter || (post.language || 'hi') === languageFilter)
    && (!topicFilter || post.cropTopics?.includes(topicFilter))
    && (!searchQuery || `${post.title} ${post.slug} ${(post.tags || []).join(' ')}`.toLowerCase().includes(searchQuery.toLowerCase())));

  if (loading) return <div className="text-center py-12 text-sm text-zinc-400 animate-pulse">लेख लोड हो रहे हैं…</div>;

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm font-bold text-foreground"><BookOpen size={16} className="text-green-400" />किसान गाइड प्रबंधन</div>
      <button type="button" disabled={submitting} onClick={openNewForm} className="inline-flex items-center gap-1.5 bg-green-500 text-green-950 font-bold px-3 py-2 rounded-lg text-xs hover:bg-green-400 disabled:opacity-50"><Plus size={14} />नई गाइड</button>
    </div>
    <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-100">
      Production लेख repository source और deployment से प्रकाशित होते हैं। Vercel पर इस file-based CMS की online save सुविधा स्थायी storage नहीं है। JSON डाउनलोड करके source में जोड़ें; स्थानीय CMS में सहेजने के लिए writable, persistent storage चाहिए।
    </p>

    <div className="grid gap-2 sm:grid-cols-3">
      <label className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
        <Search size={14} className="text-zinc-400 shrink-0" />
        <input aria-label="शीर्षक, URL या टैग खोजें" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="शीर्षक, URL या टैग खोजें…" className="bg-transparent text-sm text-foreground w-full outline-none" />
      </label>
      <select aria-label="लेख की भाषा से छाँटें" value={languageFilter} onChange={e => setLanguageFilter(e.target.value)} className={INPUT}>
        <option value="">सभी भाषाएँ</option>{Object.entries(LANGUAGES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      <select aria-label="फसल समूह से छाँटें" value={topicFilter} onChange={e => setTopicFilter(e.target.value)} className={INPUT}>
        <option value="">सभी फसल समूह</option>{CROP_TOPICS.map(topic => <option key={topic.id} value={topic.id}>{topic.nameHi}</option>)}
      </select>
    </div>
    <div className="flex gap-2 flex-wrap" aria-label="प्रकाशन स्थिति">
      {FILTER_TABS.map(tab => <button type="button" key={tab.key} onClick={() => setFilter(tab.key)} aria-pressed={filter === tab.key} className={`px-3 py-2 rounded-lg text-xs font-medium ${filter === tab.key ? 'bg-green-500 text-green-950 font-bold' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}>
        {tab.label} ({tab.key === 'all' ? posts.length : posts.filter(post => post.status === tab.key).length})
      </button>)}
    </div>
    {error && <div role="alert" className="text-sm text-red-300 bg-red-500/10 rounded-lg p-3">{error}<button type="button" onClick={loadPosts} className="ml-3 underline">फिर कोशिश करें</button></div>}

    {showForm && <form noValidate onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-5">
      <div className="flex justify-between items-center gap-3">
        <h2 className="text-sm font-bold text-foreground">{editingId ? 'गाइड संपादित करें' : 'नई गाइड बनाएं'}</h2>
        <button type="button" disabled={submitting} onClick={closeForm} className={BUTTON}>बंद करें</button>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">ड्राफ़्ट में अधूरी जानकारी रख सकते हैं। प्रकाशन से पहले स्रोत, चित्र, लागू क्षेत्र और सामग्री पूरी करें। CMS save में लेखक और तारीख सर्वर तय करता है; JSON export मौजूदा पहचान व प्रकाशन की तारीख रखता है।</p>

      <fieldset disabled={submitting} className="space-y-4 disabled:opacity-60">
        <legend className="text-sm font-semibold text-zinc-100 mb-3">लेख और सारांश</legend>
        <Field label="शीर्षक *"><input required value={form.title} onChange={e => { const title = e.target.value; setForm(prev => ({ ...prev, title, slug: slugManual ? prev.slug : slugify(title) })); }} className={INPUT} /></Field>
        <Field label="URL slug *" hint="अक्षर, अंक और hyphen रखें; अंग्रेज़ी छोटा slug भी लिख सकते हैं। प्रकाशित लेख का slug बदलने से उसके पुराने links टूट सकते हैं।">
          <input required value={form.slug} onChange={e => { setSlugManual(true); updateForm('slug', e.target.value); }} placeholder="dhan-bhandaran-guide" className={INPUT} />
        </Field>
        <Field label="सारांश"><textarea rows={3} value={form.excerpt} onChange={e => updateForm('excerpt', e.target.value)} className={INPUT} /></Field>
        <Field label="सामग्री (Markdown)"><textarea rows={15} value={form.content} onChange={e => updateForm('content', e.target.value)} className={`${INPUT} font-mono leading-relaxed`} /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="श्रेणी"><input value={form.category} onChange={e => updateForm('category', e.target.value)} placeholder="फसल की तैयारी" className={INPUT} /></Field>
          <Field label="टैग — कॉमा से अलग"><input value={form.tags} onChange={e => updateForm('tags', e.target.value)} placeholder="धान, भंडारण" className={INPUT} /></Field>
        </div>
        <Field label="मुख्य बातें — हर पंक्ति में एक"><textarea rows={3} value={form.takeaways} onChange={e => updateForm('takeaways', e.target.value)} className={INPUT} /></Field>
      </fieldset>

      <fieldset disabled={submitting} className="space-y-4 border-t border-zinc-800 pt-4">
        <legend className="text-sm font-semibold text-zinc-100 px-1">फसल, क्षेत्र और भाषा</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="लेख की भाषा"><select value={form.language} onChange={e => updateForm('language', e.target.value)} className={INPUT}>{Object.entries(LANGUAGES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
          <Field label="क्षेत्र का स्पष्ट नाम" hint="जैसे: सामान्य जानकारी — स्थानीय सलाह के अनुसार लागू करें।"><input value={form.regionLabel} onChange={e => updateForm('regionLabel', e.target.value)} className={INPUT} /></Field>
        </div>
        <fieldset>
          <legend className="text-xs font-medium text-zinc-300 mb-2">लेख किन फसल समूहों से जुड़ा है?</legend>
          <p className="text-xs text-zinc-400 mb-2">सिर्फ लेख में वास्तव में शामिल समूह चुनें। सामान्य मौसम या लागत की गाइड में इसे खाली रख सकते हैं।</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-52 overflow-y-auto rounded-lg border border-zinc-700 p-3">
            {CROP_TOPICS.map(topic => <label key={topic.id} className="flex gap-2 items-start text-xs text-zinc-200 leading-relaxed"><input type="checkbox" checked={form.cropTopics.includes(topic.id)} onChange={() => toggleSelection('cropTopics', topic.id)} className="mt-1 accent-green-500" />{topic.nameHi}</label>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs font-medium text-zinc-300 mb-2">लागू राज्य / केंद्रशासित प्रदेश</legend>
          <p className="text-xs text-zinc-400 mb-2">खाली चयन = सामान्य गाइड। इससे कोई कृषि सलाह हर राज्य के लिए प्रमाणित नहीं हो जाती; लागू क्षेत्र ऊपर स्पष्ट लिखें।</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto rounded-lg border border-zinc-700 p-3">
            {Object.entries(STATE_NAMES).map(([id, name]) => <label key={id} className="flex gap-2 items-start text-xs text-zinc-200 leading-relaxed"><input type="checkbox" checked={form.stateIds.includes(id)} onChange={() => toggleSelection('stateIds', id)} className="mt-1 accent-green-500" />{name}</label>)}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm text-zinc-200"><input type="checkbox" checked={form.weatherRelevant} onChange={e => updateForm('weatherRelevant', e.target.checked)} className="accent-green-500" />मौसम से जुड़ी गाइड — IMD advisory का रास्ता दिखाएँ</label>
        <Field label="अनुवाद समूह" hint="केवल उसी लेख के जाँचे हुए अनुवादों में एक समान पहचान रखें। उदाहरण: paddy-storage। खाली होने पर अनुवाद संबंध नहीं बनेगा।"><input value={form.translationGroup} onChange={e => updateForm('translationGroup', e.target.value)} className={INPUT} /></Field>
      </fieldset>

      <fieldset disabled={submitting} className="space-y-3 border-t border-zinc-800 pt-4">
        <legend className="text-sm font-semibold text-zinc-100 px-1">स्रोत और सत्यापन</legend>
        <p className="text-xs text-zinc-400 leading-relaxed">हर स्रोत का मूल link और वास्तव में पढ़ने की तारीख दें। किसी expert का नाम या समीक्षा अपने-आप नहीं जोड़ी जाती।</p>
        {form.sources.map((source, index) => <div key={index} className="space-y-3 rounded-lg border border-zinc-700 p-3">
          <div className="flex items-center justify-between"><span className="text-xs text-zinc-300">स्रोत {index + 1}</span><button type="button" onClick={() => updateForm('sources', form.sources.filter((_, i) => i !== index))} className={`${BUTTON} text-red-300`} aria-label={`स्रोत ${index + 1} हटाएँ`}><Trash2 size={14} />हटाएँ</button></div>
          <Field label="स्रोत / दस्तावेज़ का शीर्षक"><input value={source.title || ''} onChange={e => updateSource(index, 'title', e.target.value)} className={INPUT} /></Field>
          <div className="grid sm:grid-cols-[2fr_1fr] gap-3">
            <Field label="मूल HTTPS URL"><input type="url" value={source.url || ''} onChange={e => updateSource(index, 'url', e.target.value)} placeholder="https://…" className={INPUT} /></Field>
            <Field label="स्रोत कब पढ़ा?"><input type="date" value={source.accessedAt || ''} onChange={e => updateSource(index, 'accessedAt', e.target.value)} className={INPUT} /></Field>
          </div>
        </div>)}
        <button type="button" onClick={() => updateForm('sources', [...form.sources, { title: '', url: '', accessedAt: '' }])} className={BUTTON}><Plus size={14} />स्रोत जोड़ें</button>
        <Field label="संपादकीय टिप्पणी" hint="लेख की सीमा, स्थानीय जाँच या अनुवाद के बारे में पाठक के लिए जरूरी जानकारी।"><textarea rows={2} value={form.editorialNote} onChange={e => updateForm('editorialNote', e.target.value)} className={INPUT} /></Field>
      </fieldset>

      <fieldset disabled={submitting} className="space-y-4 border-t border-zinc-800 pt-4">
        <legend className="text-sm font-semibold text-zinc-100 px-1">चित्र और खोज परिणाम</legend>
        <Field label="कवर चित्र का स्थानीय path" hint="उदाहरण: /editorial/dhan-katai-barish.webp — image वेबसाइट पर पहले उपलब्ध होनी चाहिए।"><input value={form.coverImage} onChange={e => updateForm('coverImage', e.target.value)} className={INPUT} /></Field>
        <Field label="चित्र का alt text" hint="चित्र में क्या दिखता है, संक्षेप में बताएँ।"><input value={form.coverAlt} onChange={e => updateForm('coverAlt', e.target.value)} className={INPUT} /></Field>
        <Field label="चित्र का caption / प्रकृति" hint="सांकेतिक या AI चित्र है तो साफ लिखें।"><input value={form.coverCaption} onChange={e => updateForm('coverCaption', e.target.value)} className={INPUT} /></Field>
        <Field label="SEO title"><input value={form.seoTitle} onChange={e => updateForm('seoTitle', e.target.value)} className={INPUT} /></Field>
        <Field label="SEO description"><textarea rows={2} value={form.seoDescription} onChange={e => updateForm('seoDescription', e.target.value)} className={INPUT} /></Field>
        <Field label="संबंधित लेखों के slug — हर पंक्ति में एक" hint="इसी भाषा में प्रकाशित लेख का slug दें; पूरा URL नहीं।"><textarea rows={3} value={form.relatedSlugs} onChange={e => updateForm('relatedSlugs', e.target.value)} className={INPUT} /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="पढ़ने का अनुमानित समय (मिनट)"><input type="number" min="1" max="120" step="1" value={form.readingMinutes} onChange={e => updateForm('readingMinutes', e.target.value)} className={INPUT} /></Field>
          <Field label="स्थानीय CMS में सहेजने के बाद स्थिति"><select value={form.status} onChange={e => updateForm('status', e.target.value)} className={INPUT}><option value="draft">ड्राफ़्ट — सार्वजनिक नहीं</option><option value="published">प्रकाशित — सार्वजनिक लेख</option></select></Field>
        </div>
      </fieldset>

      {formError && <div role="alert" className="whitespace-pre-line text-sm leading-relaxed text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{formError}</div>}
      <div className="flex gap-2 flex-wrap border-t border-zinc-800 pt-4">
        <button type="button" disabled={submitting} onClick={downloadJson} className="inline-flex items-center gap-2 bg-green-500 text-green-950 font-bold px-4 py-2 rounded-lg text-sm hover:bg-green-400 disabled:opacity-50"><Download size={15} />JSON डाउनलोड करें</button>
        <button type="submit" disabled={submitting} className={BUTTON}>{submitting ? 'सहेजा जा रहा है…' : 'स्थानीय CMS में सहेजें'}</button>
        <button type="button" disabled={submitting} onClick={closeForm} className={BUTTON}>रद्द करें</button>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">डाउनलोड से वेबसाइट पर कुछ प्रकाशित नहीं होता। नई गाइड हमेशा draft और मौजूदा गाइड अपनी पिछली स्थिति में export होती है। Source में शामिल करने से पहले पूरी content validation चलाएँ और फिर deploy करें।</p>
    </form>}

    <div className="space-y-2">
      {filtered.map(post => <article key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap"><h3 className="text-sm font-semibold text-foreground">{post.title}</h3><span className={`px-2 py-0.5 rounded text-xs font-semibold ${post.status === 'published' ? 'bg-green-500/15 text-green-400' : 'bg-zinc-800 text-zinc-300'}`}>{post.status === 'published' ? 'प्रकाशित' : 'ड्राफ़्ट'}</span></div>
            {post.excerpt && <p className="text-xs text-zinc-400 line-clamp-2">{post.excerpt}</p>}
            <div className="text-xs text-zinc-400 flex items-center gap-x-3 gap-y-1 flex-wrap"><span>{LANGUAGES[post.language || 'hi'] || post.language}</span><span>अपडेट: {formatDate(post.updatedAt || post.createdAt)}</span><span>{post.sources?.length || 0} स्रोत</span>{post.regionLabel && <span>{post.regionLabel}</span>}</div>
            {!!post.cropTopics?.length && <div className="flex gap-1 flex-wrap">{post.cropTopics.map(id => <span key={id} className="text-xs rounded bg-zinc-800 text-zinc-300 px-2 py-1">{CROP_TOPICS.find(topic => topic.id === id)?.nameHi || id}</span>)}</div>}
          </div>
          <div className="flex gap-1 shrink-0">
            {post.status === 'published' && <a href={`/blog/${encodeURIComponent(post.slug)}`} target="_blank" rel="noopener noreferrer" title="प्रकाशित लेख खोलें" aria-label={`${post.title} — प्रकाशित लेख खोलें`} className="p-2 rounded-lg text-zinc-300 hover:bg-zinc-800"><ExternalLink size={15} /></a>}
            <button type="button" disabled={submitting} onClick={() => openEditForm(post)} title="संपादित करें" aria-label={`${post.title} संपादित करें`} className="p-2 rounded-lg text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"><PenLine size={15} /></button>
            <button type="button" disabled={submitting} onClick={() => handleDelete(post.id)} title="हटाएँ" aria-label={`${post.title} हटाएँ`} className="p-2 rounded-lg text-zinc-300 hover:text-red-300 hover:bg-zinc-800 disabled:opacity-50"><Trash2 size={15} /></button>
          </div>
        </div>
      </article>)}
      {!filtered.length && <p className="text-center py-8 text-sm text-zinc-400">इन फ़िल्टर में कोई गाइड नहीं मिली।</p>}
    </div>
  </div>;
}
