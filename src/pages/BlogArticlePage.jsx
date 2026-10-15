import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, Tag, User, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import SEO, { SITE_URL } from '@/components/SEO';
import Brand from '@/components/Brand';
import { useApi } from '@/hooks/useApi';
import Markdown from 'react-markdown';
import '../styles/detail.css';

function formatDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('hi-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  }) : null;
}

export default function BlogArticlePage() {
  const { slug } = useParams();
  const { data: post, loading, error } = useApi(`/cms/blog/${encodeURIComponent(slug)}`);
  const hasPost = post && typeof post.title === 'string';
  const publishedDate = post?.publishedAt ? formatDate(post.publishedAt) : null;
  const tags = Array.isArray(post?.tags) ? post.tags.filter(tag => typeof tag === 'string') : [];

  return <div className="sb-detail-page sb-article-page">
    <SEO title={hasPost ? post.title : 'किसान मार्गदर्शिका'} description={hasPost ? (post.excerpt || post.title) : 'खेती और मंडी भाव के बारे में सही भाव पर पढ़ें।'} path={`/blog/${slug}`} noIndex={!loading && !hasPost}
      structuredData={hasPost ? { '@context': 'https://schema.org', '@graph': [
        { '@type': 'BlogPosting', headline: post.title, description: post.excerpt || post.title, url: `${SITE_URL}/blog/${slug}`, inLanguage: 'hi',
          ...(publishedDate ? { datePublished: post.publishedAt } : {}),
          ...(post.author ? { author: { '@type': 'Person', name: post.author } } : {}),
          publisher: { '@type': 'Organization', name: 'SahiBhav', url: SITE_URL } },
        { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'सही भाव', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'मार्गदर्शिका', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${slug}` },
        ] },
      ] } : undefined} />
    <header className="sb-detail-header"><div className="sb-detail-header__inner">
      <Link to="/" aria-label="सही भाव के मुख्य पृष्ठ पर जाएँ"><Brand /></Link>
      <Link to="/blog" className="sb-detail-back"><ArrowLeft size={16} aria-hidden="true" /> सभी लेख</Link>
    </div></header>
    <main className="sb-article-main" id="main-content">
      <nav className="sb-detail-breadcrumb" aria-label="पृष्ठ पथ"><Link to="/">सही भाव</Link><span aria-hidden="true">/</span><Link to="/blog">मार्गदर्शिका</Link><span aria-hidden="true">/</span><span>लेख</span></nav>
      {loading && <div className="sb-detail-status" role="status"><RefreshCw size={24} aria-hidden="true" /><h1>लेख लोड हो रहा है</h1><p>कृपया कुछ पल रुकें।</p></div>}
      {!loading && !hasPost && <div className="sb-detail-status" role={error ? 'alert' : 'status'}>
        {error ? <AlertCircle size={32} aria-hidden="true" /> : <BookOpen size={32} aria-hidden="true" />}
        <h1>{error ? 'लेख लोड नहीं हो पाया' : 'यह लेख नहीं मिला'}</h1>
        <p>{error ? 'कनेक्शन की जाँच करके दोबारा कोशिश करें।' : 'यह लिंक बदल गया हो सकता है। सभी लेखों की सूची खोलें।'}</p>
        {error && <button className="sb-detail-primary" type="button" onClick={() => window.location.reload()}>फिर कोशिश करें</button>}
        <Link to="/blog" className="sb-detail-text-link">सभी लेख देखें <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>}
      {hasPost && <article className="sb-article">
        <header className="sb-article-heading"><span className="sb-detail-kicker"><BookOpen size={15} aria-hidden="true" /> किसान मार्गदर्शिका</span><h1>{post.title}</h1>
          {post.excerpt && <p className="sb-article-excerpt">{post.excerpt}</p>}
          <div className="sb-article-meta">{post.author && <span><User size={15} aria-hidden="true" />{post.author}</span>}{publishedDate && <span><Calendar size={15} aria-hidden="true" /><time dateTime={post.publishedAt}>{publishedDate}</time></span>}</div>
          {tags.length > 0 && <div className="sb-article-tags" aria-label="लेख के विषय"><Tag size={14} aria-hidden="true" />{tags.map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}</div>}
        </header>
        <div className="sb-article-content"><Markdown>{typeof post.content === 'string' ? post.content : ''}</Markdown></div>
        <footer className="sb-article-end"><div><span className="sb-detail-kicker">आगे पढ़ें</span><h2>बेहतर समझ, बेहतर फ़ैसले।</h2><p>खेती और मंडी से जुड़ी दूसरी मार्गदर्शिकाएँ देखें।</p></div><Link to="/blog" className="sb-detail-primary">और लेख पढ़ें <ArrowRight size={17} aria-hidden="true" /></Link></footer>
      </article>}
    </main>
  </div>;
}
