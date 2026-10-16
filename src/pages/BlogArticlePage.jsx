import { Children, isValidElement } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, UserRound, BookOpen, AlertCircle, RefreshCw, Check, ExternalLink, List } from 'lucide-react';
import SEO, { SITE_URL } from '@/components/SEO';
import Brand from '@/components/Brand';
import { useApi } from '@/hooks/useApi';
import Markdown from 'react-markdown';
import '@/styles/detail.css';
import '@/styles/editorial.css';

function formatDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : null;
}
function textContent(children) { return Children.toArray(children).map(child => isValidElement(child) ? textContent(child.props.children) : String(child)).join(''); }
function sectionId(text) { return `section-${text.replace(/[*_`]/g, '').trim().replace(/[^\p{L}\p{M}\p{N}\s-]/gu, '').replace(/\s+/g, '-').toLowerCase()}`; }
function safeSourceUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
function ArticleLink({ href, children }) {
  if (href?.startsWith('/') && !href.startsWith('//')) return <Link to={href}>{children}</Link>;
  return <a href={href} rel="noopener noreferrer">{children}</a>;
}
export default function BlogArticlePage() {
  const { slug } = useParams();
  const { data: post, loading, error } = useApi(`/cms/blog/${encodeURIComponent(slug)}`);
  const { data: collection } = useApi('/cms/blog?page=1&limit=50');
  const hasPost = post && typeof post.title === 'string';
  const publishedDate = post?.publishedAt ? formatDate(post.publishedAt) : null;
  const updatedDate = post?.updatedAt ? formatDate(post.updatedAt) : null;
  const content = typeof post?.content === 'string' ? post.content : '';
  const tags = Array.isArray(post?.tags) ? post.tags.filter(tag => typeof tag === 'string') : [];
  const takeaways = Array.isArray(post?.takeaways) ? post.takeaways.filter(item => typeof item === 'string') : [];
  const sources = Array.isArray(post?.sources) ? post.sources.filter(source => source.title && safeSourceUrl(source.url)) : [];
  const articlePath = `/blog/${slug}`;
  const coverImage = post?.coverImage ? new URL(post.coverImage, SITE_URL).href : undefined;
  const isMissing = !loading && !hasPost && (!error || /API (?:404|422):/.test(error.message));
  const headings = [...content.matchAll(/^##\s+(.+)$/gm)].map(match => ({ title: match[1].replace(/[*_`]/g, '').trim(), id: sectionId(match[1]) }));
  const relatedSlugs = Array.isArray(post?.relatedSlugs) ? post.relatedSlugs : [];
  const candidates = (collection?.posts || []).filter(item => item.slug !== slug);
  const relatedPosts = (relatedSlugs.length > 0 ? relatedSlugs.map(relatedSlug => candidates.find(item => item.slug === relatedSlug)).filter(Boolean) : candidates).slice(0, 3);
  return <div className="sb-journal-page sb-journal-article-page">
    <SEO title={hasPost ? (post.seoTitle || post.title) : 'किसान मार्गदर्शिका'} description={hasPost ? (post.seoDescription || post.excerpt || post.title) : 'खेती और मंडी भाव के बारे में सही भाव पर पढ़ें।'} path={articlePath} noIndex={isMissing} image={coverImage} imageAlt={post?.coverAlt} type="article" structuredData={hasPost ? { '@context': 'https://schema.org', '@graph': [
      { '@type': 'BlogPosting', headline: post.title, description: post.seoDescription || post.excerpt || post.title, url: `${SITE_URL}${articlePath}`, mainEntityOfPage: `${SITE_URL}${articlePath}`, inLanguage: 'hi', ...(publishedDate ? { datePublished: post.publishedAt } : {}), ...(updatedDate ? { dateModified: post.updatedAt } : {}), ...(coverImage ? { image: [coverImage] } : {}), ...(post.category ? { articleSection: post.category } : {}), ...(post.author ? { author: { '@type': post.authorType === 'Organization' ? 'Organization' : 'Person', name: post.author } } : {}), publisher: { '@type': 'Organization', name: 'SahiBhav', url: SITE_URL } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'सही भाव', item: `${SITE_URL}/` }, { '@type': 'ListItem', position: 2, name: 'मार्गदर्शिका', item: `${SITE_URL}/blog` }, { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}${articlePath}` }] },
    ] } : undefined} />
    <a className="sb-journal-skip" href="#main-content">लेख पर जाएँ</a>
    <header className="sb-journal-header"><div className="sb-journal-header__inner"><Link to="/" aria-label="सही भाव के मुख्य पृष्ठ पर जाएँ"><Brand /></Link><Link to="/blog" className="sb-journal-back"><ArrowLeft size={16} aria-hidden="true" /> सभी मार्गदर्शिकाएँ</Link></div></header>
    <main className="sb-journal-article-main" id="main-content">
      <nav className="sb-journal-breadcrumb" aria-label="पृष्ठ पथ"><Link to="/">सही भाव</Link><span aria-hidden="true">/</span><Link to="/blog">मार्गदर्शिका</Link><span aria-hidden="true">/</span><span aria-current="page">{post?.category || 'लेख'}</span></nav>
      {loading && !hasPost && <div className="sb-detail-status" role="status"><RefreshCw size={24} aria-hidden="true" /><h1>लेख लोड हो रहा है</h1><p>कृपया कुछ पल रुकें।</p></div>}
      {!loading && !hasPost && <div className="sb-detail-status" role={error ? 'alert' : 'status'}>{error ? <AlertCircle size={32} aria-hidden="true" /> : <BookOpen size={32} aria-hidden="true" />}<h1>{isMissing ? 'यह लेख नहीं मिला' : 'लेख लोड नहीं हो पाया'}</h1><p>{isMissing ? 'यह लिंक बदल गया हो सकता है। सभी लेखों की सूची खोलें।' : 'कनेक्शन की जाँच करके दोबारा कोशिश करें।'}</p>{!isMissing && <button className="sb-journal-button" type="button" onClick={() => window.location.reload()}>फिर कोशिश करें</button>}<Link to="/blog" className="sb-detail-text-link">सभी लेख देखें <ArrowRight size={16} aria-hidden="true" /></Link></div>}
      {hasPost && <><article className="sb-journal-article">
        <header className="sb-journal-article-heading"><span className="sb-journal-category">{post.category || 'किसान मार्गदर्शिका'}</span><h1>{post.title}</h1>{post.excerpt && <p className="sb-journal-deck">{post.excerpt}</p>}<div className="sb-journal-byline">{post.author && <span><UserRound size={15} aria-hidden="true" />{post.author}</span>}{publishedDate && <span><CalendarDays size={15} aria-hidden="true" />प्रकाशित: <time dateTime={post.publishedAt}>{publishedDate}</time></span>}{updatedDate && <span>संशोधित: <time dateTime={post.updatedAt}>{updatedDate}</time></span>}</div>{post.authorType === 'Organization' && <p className="sb-journal-editorial-note">आधिकारिक स्रोतों पर आधारित संपादकीय मार्गदर्शिका</p>}</header>
        {post.coverImage && <figure className="sb-journal-cover"><img src={post.coverImage} alt={post.coverAlt || post.title} width="1672" height="941" fetchPriority="high" /><figcaption>{post.coverCaption || 'सांकेतिक AI illustration; किसी वास्तविक घटना या वर्तमान मौसम का प्रमाण नहीं।'}</figcaption></figure>}
        <div className="sb-journal-reading-layout"><div className="sb-journal-reading-main">
          {takeaways.length > 0 && <section className="sb-journal-takeaways" aria-labelledby="takeaway-title"><span className="sb-journal-eyebrow">पहले ये समझें</span><h2 id="takeaway-title">इस गाइड की मुख्य बातें</h2><ul>{takeaways.map((item, index) => <li key={index}><Check size={18} aria-hidden="true" /><span>{item}</span></li>)}</ul></section>}
          <div className="sb-article-content sb-journal-prose"><Markdown components={{ h1: ({ children }) => <h2>{children}</h2>, h2: ({ children }) => <h2 id={sectionId(textContent(children))}>{children}</h2>, a: ArticleLink }}>{content}</Markdown></div>
          {sources.length > 0 && <section className="sb-journal-sources" aria-labelledby="sources-title"><span className="sb-journal-eyebrow">आगे जाँचने के लिए</span><h2 id="sources-title">स्रोत और आधिकारिक जानकारी</h2><p>अपने क्षेत्र की नवीनतम सूचना के लिए मूल स्रोत खोलें।</p><ol>{sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={safeSourceUrl(source.url)} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={14} aria-hidden="true" /><span className="sb-journal-sr-only"> (नई टैब में खुलेगा)</span></a>{source.accessedAt && formatDate(source.accessedAt) && <span>स्रोत देखा: <time dateTime={source.accessedAt}>{formatDate(source.accessedAt)}</time></span>}</li>)}</ol></section>}
          {tags.length > 0 && <div className="sb-journal-tags" aria-label="लेख के विषय">{tags.map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}</div>}
        </div><aside className="sb-journal-reading-aside">
          {headings.length > 1 && <nav className="sb-journal-contents" aria-label="इस लेख में"><h2><List size={17} aria-hidden="true" /> इस लेख में</h2><ol>{headings.map((heading, index) => <li key={`${heading.id}-${index}`}><a href={`#${heading.id}`}>{heading.title}</a></li>)}</ol>{sources.length > 0 && <a className="sb-journal-source-jump" href="#sources-title">आधिकारिक स्रोत <ArrowRight size={14} aria-hidden="true" /></a>}</nav>}
          <div className="sb-journal-tool"><span className="sb-journal-eyebrow">मंडी जाने से पहले</span><h2>ढुलाई का खर्च भी जोड़ें।</h2><p>वाहन, दूरी और माल की मात्रा से बिक्री की तैयारी करें।</p><Link to="/delivery-calculator">डिलीवरी खर्च देखें <ArrowRight size={16} aria-hidden="true" /></Link></div>
        </aside></div>
      </article>
      {relatedPosts.length > 0 && <section className="sb-journal-related" aria-labelledby="related-title"><div className="sb-journal-section-heading"><div><span className="sb-journal-eyebrow">अगला उपयोगी सवाल</span><h2 id="related-title">साथ में ये भी पढ़ें</h2></div><Link to="/blog">सभी लेख <ArrowRight size={16} aria-hidden="true" /></Link></div><div className="sb-journal-grid">{relatedPosts.map(related => <article className="sb-journal-card" key={related.slug}>{related.coverImage && <Link to={`/blog/${related.slug}`} className="sb-journal-card__image" tabIndex={-1} aria-hidden="true"><img src={related.coverImage} alt="" width="1672" height="941" loading="lazy" decoding="async" /><span className="sb-journal-image-note">सांकेतिक चित्र</span></Link>}<div className="sb-journal-card__body"><span className="sb-journal-category">{related.category || 'खेती की समझ'}</span><h3><Link to={`/blog/${related.slug}`}>{related.title}</Link></h3><Link to={`/blog/${related.slug}`} className="sb-journal-card__link" aria-label={`${related.title} — लेख पढ़ें`}>लेख पढ़ें <ArrowRight size={16} aria-hidden="true" /></Link></div></article>)}</div></section>}
      <footer className="sb-journal-footer"><span>सही भाव · जानकारी से बेहतर तैयारी</span><Link to="/blog"><ArrowLeft size={15} aria-hidden="true" /> सभी मार्गदर्शिकाएँ</Link></footer></>}
    </main>
  </div>;
}
