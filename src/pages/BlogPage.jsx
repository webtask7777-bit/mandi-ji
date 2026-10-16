import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, Clock3, Leaf, MapPin } from 'lucide-react';
import SEO from '@/components/SEO';
import Brand from '@/components/Brand';
import { useApi } from '@/hooks/useApi';
import '@/styles/editorial.css';

function formatDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : null;
}
function PostMeta({ post }) {
  const date = formatDate(post.updatedAt || post.publishedAt);
  return <div className="sb-journal-meta">{date && <span><CalendarDays size={14} aria-hidden="true" /><time dateTime={post.updatedAt || post.publishedAt}>{date}</time></span>}{post.readingMinutes && <span><Clock3 size={14} aria-hidden="true" />लगभग {post.readingMinutes} मिनट</span>}</div>;
}
export default function BlogPage() {
  const [previousPosts, setPreviousPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('सभी लेख');
  const { data, loading, error } = useApi(`/cms/blog?page=${page}&limit=10`);
  const posts = [...new Map([...previousPosts, ...(data?.posts || [])].map(post => [post.slug, post])).values()];
  const totalPages = data?.totalPages || page;
  const categories = ['सभी लेख', ...new Set(posts.map(post => post.category).filter(Boolean))];
  const visiblePosts = category === 'सभी लेख' ? posts : posts.filter(post => post.category === category);
  const featured = posts.find(post => post.coverImage) || posts[0];
  return <div className="sb-journal-page">
    <SEO title="खेती, मौसम और मंडी की किसान मार्गदर्शिकाएँ" description="धान कटाई, बारिश में भीगी फसल, रबी की तैयारी, मौसम सूचना और मंडी तक ढुलाई खर्च पर स्रोतों सहित हिंदी किसान गाइड पढ़ें।" path="/blog" />
    <a className="sb-journal-skip" href="#main-content">लेखों पर जाएँ</a>
    <header className="sb-journal-header"><div className="sb-journal-header__inner"><Link to="/" aria-label="सही भाव के मुख्य पृष्ठ पर जाएँ"><Brand /></Link><nav aria-label="मुख्य लिंक"><Link to="/">मंडी भाव</Link><Link to="/delivery-calculator">डिलीवरी खर्च <ArrowRight size={15} aria-hidden="true" /></Link></nav></div></header>
    <main className="sb-journal-main" id="main-content">
      <section className="sb-journal-intro" aria-labelledby="journal-title"><div><span className="sb-journal-eyebrow"><Leaf size={15} aria-hidden="true" /> सही भाव मार्गदर्शिका</span><h1 id="journal-title">खेती की तैयारी,<br /><em>हर मौसम के साथ।</em></h1><p>फसल, मौसम और मंडी के फैसलों के लिए आसान हिंदी में जानकारी।<br className="sb-journal-desktop-break" /> स्रोत पढ़ें, अपनी परिस्थिति समझें और अगला कदम तय करें।</p></div><div className="sb-journal-focus"><MapPin size={18} aria-hidden="true" /><div><strong>स्थानीय ज़रूरतों से शुरुआत</strong><span>छत्तीसगढ़ की खेती से जुड़े सवाल<br />और दूसरे क्षेत्रों के लिए उपयोगी समझ।</span></div></div></section>
      {featured && <section className="sb-journal-feature" aria-labelledby="featured-title"><Link to={`/blog/${featured.slug}`} className="sb-journal-feature__image" aria-label={featured.title}><img src={featured.coverImage || '/visuals/guide-sale-checklist.webp'} alt={featured.coverAlt || 'खेती और बिक्री की तैयारी का सांकेतिक चित्र'} width="1672" height="941" fetchPriority="high" /><span className="sb-journal-image-note">सांकेतिक चित्र</span></Link><div className="sb-journal-feature__copy"><span className="sb-journal-eyebrow">पढ़ने की शुरुआत यहाँ से करें</span>{featured.category && <span className="sb-journal-category">{featured.category}</span>}<h2 id="featured-title"><Link to={`/blog/${featured.slug}`}>{featured.title}</Link></h2><p>{featured.excerpt}</p><PostMeta post={featured} /><Link to={`/blog/${featured.slug}`} className="sb-journal-button">पूरी मार्गदर्शिका पढ़ें <ArrowRight size={18} aria-hidden="true" /></Link></div></section>}
      <section className="sb-journal-library" aria-labelledby="guides-title"><div className="sb-journal-section-heading"><div><span className="sb-journal-eyebrow">सवाल से समाधान तक</span><h2 id="guides-title">काम की किसान गाइड</h2></div><span>{posts.length > 0 ? `${posts.length} लेख उपलब्ध` : 'सही भाव संपादकीय'}</span></div>
        {categories.length > 2 && <div className="sb-journal-filters" role="group" aria-label="लेख का विषय चुनें">{categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>}
        {loading && posts.length === 0 && <div className="sb-journal-status" role="status">मार्गदर्शिकाएँ लोड हो रही हैं…</div>}
        {!loading && posts.length === 0 && <div className="sb-journal-status" role={error ? 'alert' : 'status'}><BookOpen size={30} aria-hidden="true" /><h3>{error ? 'लेख अभी नहीं खुल पाए' : 'नई मार्गदर्शिकाएँ जल्द आएँगी'}</h3><p>{error ? 'कनेक्शन जाँचकर पृष्ठ दोबारा खोलें।' : 'खेती और मंडी से जुड़े लेख यहाँ मिलेंगे।'}</p></div>}
        <div className="sb-journal-grid">{visiblePosts.map(post => <article className="sb-journal-card" key={post.slug}><Link to={`/blog/${post.slug}`} className="sb-journal-card__image" tabIndex={-1} aria-hidden="true"><img src={post.coverImage || '/visuals/guide-sale-checklist.webp'} alt="" width="1672" height="941" loading="lazy" decoding="async" /><span className="sb-journal-image-note">सांकेतिक चित्र</span></Link><div className="sb-journal-card__body"><span className="sb-journal-category">{post.category || 'खेती की समझ'}</span><h3><Link to={`/blog/${post.slug}`}>{post.title}</Link></h3><p>{post.excerpt}</p><PostMeta post={post} /><Link to={`/blog/${post.slug}`} className="sb-journal-card__link" aria-label={`${post.title} — लेख पढ़ें`}>लेख पढ़ें <ArrowRight size={16} aria-hidden="true" /></Link></div></article>)}</div>
        {page < totalPages && <button type="button" onClick={() => { setPreviousPosts(posts); setPage(current => current + 1); }} disabled={loading} className="sb-journal-load-more">{loading ? 'लोड हो रहा है…' : 'और मार्गदर्शिकाएँ देखें'} <ArrowRight size={16} aria-hidden="true" /></button>}
      </section>
      <aside className="sb-journal-method"><BookOpen size={24} aria-hidden="true" /><div><h2>स्रोतों के साथ पढ़ें। स्थानीय सलाह से मिलाएँ।</h2><p>इन गाइड में तैयारी और फैसले समझाए गए हैं। वर्तमान मौसम चेतावनी, खेती का उपचार या सहायता की पात्रता के लिए लेख में दिए आधिकारिक स्रोत और स्थानीय कृषि सलाह जाँचें।</p></div></aside>
      <footer className="sb-journal-footer"><span>सही भाव · जानकारी से बेहतर तैयारी</span><Link to="/">मंडी भाव देखें <ArrowRight size={15} aria-hidden="true" /></Link></footer>
    </main>
  </div>;
}
