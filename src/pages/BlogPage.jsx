import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Calendar, Tag } from 'lucide-react';
import { fadeInUp } from '@/utils/animations';
import SEO from '@/components/SEO';
import { Card } from '@/components/ui/card';
import { apiFetch } from '@/api/client';

export default function BlogPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/cms/blog?page=${page}&limit=10`)
      .then(d => { setPosts(prev => page === 1 ? d.posts : [...prev, ...d.posts]); setTotalPages(d.totalPages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  function formatDate(d) {
    return new Date(d).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground max-w-lg mx-auto flex flex-col">
      <SEO title="ब्लॉग" description="मंडीजी ब्लॉग — कृषि टिप्स, मंडी समाचार, और किसान गाइड।" path="/blog" />
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <BookOpen size={18} className="text-green-500" />
          <h1 className="text-base font-bold">ब्लॉग</h1>
        </div>
      </header>

      <motion.div {...fadeInUp} className="flex-1 px-4 py-6 space-y-4">
        {loading && posts.length === 0 && (
          <div className="text-center py-12 text-zinc-500 text-sm animate-pulse">लोड हो रहा है...</div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-12">
            <BookOpen size={32} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">अभी कोई पोस्ट नहीं है</p>
            <p className="text-xs text-zinc-600 mt-1">जल्द ही नए लेख आएंगे!</p>
          </div>
        )}

        {posts.map(post => (
          <Link key={post.id} to={`/blog/${post.slug}`}>
            <Card className="bg-zinc-900 border-zinc-800 p-4 hover:border-green-500/30 transition-colors">
              <h2 className="text-sm font-bold text-foreground mb-1.5">{post.title}</h2>
              {post.excerpt && (
                <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{post.excerpt}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <Calendar size={10} />
                  {formatDate(post.publishedAt)}
                </div>
                {post.tags?.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <Tag size={9} className="text-zinc-500" />
                    {post.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </Link>
        ))}

        {page < totalPages && (
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-green-500 font-semibold hover:bg-zinc-800 transition-colors"
          >
            {loading ? 'लोड हो रहा है...' : 'और पोस्ट देखें'}
          </button>
        )}
      </motion.div>
    </div>
  );
}
