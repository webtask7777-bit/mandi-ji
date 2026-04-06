import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Tag, User } from 'lucide-react';
import { fadeInUp } from '@/utils/animations';
import SEO from '@/components/SEO';
import { useApi } from '@/hooks/useApi';
import Markdown from 'react-markdown';

export default function BlogArticlePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: post, loading } = useApi(`/cms/blog/${slug}`);

  function formatDate(d) {
    return new Date(d).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground max-w-lg mx-auto flex flex-col">
      {post && (
        <SEO
          title={post.title}
          description={post.excerpt || post.title}
          path={`/blog/${slug}`}
        />
      )}
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate('/blog')} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <h1 className="text-base font-bold truncate">{post?.title || 'लेख'}</h1>
        </div>
      </header>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-zinc-500 animate-pulse">लोड हो रहा है...</div>
        </div>
      )}

      {!loading && !post && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
          <span className="text-5xl">📝</span>
          <p className="text-sm text-zinc-400">यह लेख नहीं मिला</p>
          <button onClick={() => navigate('/blog')}
            className="px-4 py-2 rounded-xl bg-green-500 text-green-950 font-bold text-sm">
            ब्लॉग पर जाएं
          </button>
        </div>
      )}

      {post && (
        <motion.article {...fadeInUp} className="flex-1 px-4 py-6">
          {/* Title */}
          <h1 className="text-lg font-extrabold text-foreground mb-3 leading-tight">{post.title}</h1>

          {/* Meta */}
          <div className="flex items-center gap-3 flex-wrap mb-5">
            {post.author && (
              <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                <User size={10} /> {post.author}
              </div>
            )}
            {post.publishedAt && (
              <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                <Calendar size={10} /> {formatDate(post.publishedAt)}
              </div>
            )}
          </div>

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-5">
              <Tag size={10} className="text-zinc-500" />
              {post.tags.map(tag => (
                <span key={tag} className="text-[9px] bg-green-500/15 text-green-500 px-2 py-0.5 rounded-full font-medium">{tag}</span>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:text-foreground prose-headings:font-bold prose-headings:text-sm prose-headings:mt-5 prose-headings:mb-2
            prose-p:text-zinc-400 prose-p:text-xs prose-p:leading-relaxed prose-p:mb-3
            prose-li:text-zinc-400 prose-li:text-xs
            prose-strong:text-foreground
            prose-a:text-green-500 prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-green-500 prose-blockquote:text-zinc-400
            prose-code:text-green-400 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded
          ">
            <Markdown>{post.content}</Markdown>
          </div>

          {/* Back to blog */}
          <div className="mt-8 pt-4 border-t border-zinc-800 text-center">
            <button onClick={() => navigate('/blog')}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-green-500 font-semibold hover:bg-zinc-800 transition-colors">
              और लेख पढ़ें
            </button>
          </div>
        </motion.article>
      )}
    </div>
  );
}
