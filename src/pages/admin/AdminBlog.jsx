import { useState, useEffect } from 'react';
import { PenLine, Trash2, Plus, Search, BookOpen } from 'lucide-react';
import { apiFetchAuth, apiPost, apiPut, apiDelete } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';

const FILTER_TABS = [
  { key: 'all', label: 'सभी' },
  { key: 'draft', label: 'ड्राफ़्ट' },
  { key: 'published', label: 'प्रकाशित' },
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

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  tags: '',
  status: 'draft',
};

export default function AdminBlog() {
  const toast = useToast();
  const confirm = useConfirm();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [slugManual, setSlugManual] = useState(false);

  function loadPosts() {
    setLoading(true);
    apiFetchAuth('/admin/blog')
      .then(data => { setPosts(data); setError(''); })
      .catch(err => setError(err.message || 'ब्लॉग पोस्ट लोड करने में विफल'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPosts(); }, []);

  function openNewForm() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setSlugManual(false);
    setShowForm(true);
  }

  function openEditForm(post) {
    setForm({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || ''),
      status: post.status || 'draft',
    });
    setEditingId(post.id);
    setSlugManual(true);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setSlugManual(false);
  }

  function handleTitleChange(value) {
    setForm(prev => ({
      ...prev,
      title: value,
      slug: slugManual ? prev.slug : slugify(value),
    }));
  }

  function handleSlugChange(value) {
    setSlugManual(true);
    setForm(prev => ({ ...prev, slug: value }));
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
        slug: form.slug.trim() || slugify(form.title),
        excerpt: form.excerpt.trim(),
        content: form.content,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: form.status,
      };

      if (editingId) {
        const updated = await apiPut(`/admin/blog/${editingId}`, body);
        setPosts(prev => prev.map(p => p.id === editingId ? { ...p, ...updated } : p));
        toast.success('पोस्ट अपडेट हो गई');
      } else {
        const created = await apiPost('/admin/blog', body);
        setPosts(prev => [created, ...prev]);
        toast.success('पोस्ट बनाई गई');
      }
      closeForm();
    } catch (err) {
      toast.error(err.message || 'सहेजने में विफल');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm('पोस्ट हटाएं?', 'क्या आप यह पोस्ट हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।');
    if (!ok) return;
    try {
      await apiDelete(`/admin/blog/${id}`);
      setPosts(prev => prev.filter(p => p.id !== id));
      if (editingId === id) closeForm();
      toast.success('पोस्ट हटा दी गई');
    } catch (err) {
      toast.error(err.message || 'हटाने में विफल');
    }
  }

  let filtered = posts;
  if (filter !== 'all') filtered = filtered.filter(p => p.status === filter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => p.title?.toLowerCase().includes(q));
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
      {/* Header with New Post button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <BookOpen size={15} className="text-green-400" />
          ब्लॉग प्रबंधन
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-1.5 bg-green-500 text-green-950 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-green-400 transition-colors active:scale-[0.98]"
        >
          <Plus size={13} />
          नई पोस्ट
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
        <Search size={14} className="text-zinc-500 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="पोस्ट शीर्षक खोजें..."
          className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-zinc-600"
        />
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
              ({tab.key === 'all' ? posts.length : posts.filter(p => p.status === tab.key).length})
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
            <span className="text-xs font-bold text-foreground">
              {editingId ? 'पोस्ट संपादित करें' : 'नई पोस्ट बनाएं'}
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
              onChange={e => handleTitleChange(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
              placeholder="पोस्ट शीर्षक"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-[10px] text-zinc-500 font-medium mb-1 block">स्लग</label>
            <input
              type="text"
              value={form.slug}
              onChange={e => handleSlugChange(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
              placeholder="post-url-slug"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="text-[10px] text-zinc-500 font-medium mb-1 block">सारांश</label>
            <textarea
              value={form.excerpt}
              onChange={e => updateForm('excerpt', e.target.value)}
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors resize-none"
              placeholder="पोस्ट का संक्षिप्त सारांश"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-[10px] text-zinc-500 font-medium mb-1 block">सामग्री (Markdown)</label>
            <textarea
              value={form.content}
              onChange={e => updateForm('content', e.target.value)}
              rows={10}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors resize-none font-mono"
              placeholder="पोस्ट सामग्री (Markdown समर्थित)"
            />
          </div>

          {/* Tags and Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 font-medium mb-1 block">टैग (कॉमा से अलग)</label>
              <input
                type="text"
                value={form.tags}
                onChange={e => updateForm('tags', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
                placeholder="कृषि, मंडी, समाचार"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-medium mb-1 block">स्थिति</label>
              <select
                value={form.status}
                onChange={e => updateForm('status', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-green-500/50 transition-colors"
              >
                <option value="draft">ड्राफ़्ट</option>
                <option value="published">प्रकाशित</option>
              </select>
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
                : editingId ? 'अपडेट करें' : 'पोस्ट बनाएं'
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

      {/* Posts List */}
      <div className="space-y-2">
        {filtered.map(post => {
          const tags = Array.isArray(post.tags) ? post.tags : [];
          return (
            <div
              key={post.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">{post.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      post.status === 'published'
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-zinc-700 text-zinc-300'
                    }`}>
                      {post.status === 'published' ? 'प्रकाशित' : 'ड्राफ़्ट'}
                    </span>
                  </div>
                  {post.excerpt && (
                    <div className="text-[11px] text-zinc-400 mb-1 line-clamp-2">{post.excerpt}</div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-zinc-500">{formatDate(post.createdAt)}</span>
                    {tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {tags.map((tag, i) => (
                          <span
                            key={i}
                            className="bg-zinc-800 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditForm(post)}
                    title="संपादित करें"
                    className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-green-500/15 hover:text-green-400 text-zinc-500 transition-colors"
                  >
                    <PenLine size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    title="हटाएं"
                    className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-red-500/15 hover:text-red-400 text-zinc-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-zinc-500">
            कोई पोस्ट नहीं मिली
          </div>
        )}
      </div>
    </div>
  );
}
