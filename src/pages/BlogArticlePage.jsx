import { Children, isValidElement } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, UserRound, BookOpen, AlertCircle, RefreshCw, Check, ExternalLink, List, MapPin, Languages } from 'lucide-react';
import SEO, { SITE_URL } from '@/components/SEO';
import Brand from '@/components/Brand';
import EditorialImage from '@/components/EditorialImage';
import LocalWeatherLinks from '@/components/LocalWeatherLinks';
import { useApi } from '@/hooks/useApi';
import { getTopicById } from '../../shared/cropTopics';
import { EDITORIAL_LANGUAGES, getEditorialLabels, editorialDate, editorialCropName, blogLanguagePath } from '@/utils/editorialLabels';
import Markdown from 'react-markdown';
import '@/styles/detail.css';
import '@/styles/editorial.css';

function textContent(children) {
  return Children.toArray(children).map(child => isValidElement(child) ? textContent(child.props.children) : String(child)).join('');
}
function sectionId(text) {
  return `section-${text.replace(/[*_`]/g, '').trim().replace(/[^\p{L}\p{M}\p{N}\s-]/gu, '').replace(/\s+/g, '-').toLowerCase()}`;
}
function safeSourceUrl(value, base) {
  try { const url = new URL(value, base); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
function ArticleLink({ href, children }) {
  if (href?.startsWith('/') && !href.startsWith('//')) return <Link to={href}>{children}</Link>;
  return <a href={href} rel="noopener noreferrer">{children}</a>;
}

export default function BlogArticlePage() {
  const { slug } = useParams();
  const { data: post, loading, error } = useApi(`/cms/blog/${encodeURIComponent(slug)}`);
  const hasPost = post && typeof post.title === 'string';
  const language = Object.hasOwn(EDITORIAL_LANGUAGES, post?.language) ? post.language : 'hi';
  const copy = getEditorialLabels(language);
  const blogPath = blogLanguagePath(language);
  const publishedDate = post?.publishedAt ? editorialDate(post.publishedAt, language) : null;
  const updatedDate = post?.updatedAt ? editorialDate(post.updatedAt, language) : null;
  const content = typeof post?.content === 'string' ? post.content : '';
  const tags = Array.isArray(post?.tags) ? post.tags.filter(tag => typeof tag === 'string') : [];
  const takeaways = Array.isArray(post?.takeaways) ? post.takeaways.filter(item => typeof item === 'string') : [];
  const sources = Array.isArray(post?.sources) ? post.sources.filter(source => source.title && safeSourceUrl(source.url)) : [];
  const articlePath = `/blog/${encodeURIComponent(slug)}`;
  const coverImage = post?.coverImage ? safeSourceUrl(post.coverImage, SITE_URL) : undefined;
  const isMissing = !loading && !hasPost && (!error || /API (?:404|422):/.test(error.message));
  const headings = [...content.matchAll(/^##\s+(.+)$/gm)].map(match => ({ title: match[1].replace(/[*_`]/g, '').trim(), id: sectionId(match[1]) }));
  const relatedPosts = Array.isArray(post?.relatedPosts) ? [...new Map(post.relatedPosts.filter(item => item.slug && item.title && item.slug !== slug).map(item => [item.slug, item])).values()].slice(0, 3) : [];
  const translationCandidates = Array.isArray(post?.translations) ? post.translations.filter(item => item.slug && item.title && Object.hasOwn(EDITORIAL_LANGUAGES, item.language)) : [];
  const translations = hasPost ? [...new Map([{ slug, title: post.title, language }, ...translationCandidates].map(item => [item.language, item])).values()] : [];
  const alternates = translations.length > 1 ? translations.map(item => ({ language: item.language, path: `/blog/${encodeURIComponent(item.slug)}` })) : undefined;
  const priceLinks = Array.isArray(post?.priceLinks) ? post.priceLinks.filter(item => typeof item.label === 'string' && /^\/(?:crop|mandi-bhav)\//.test(item.path || '')) : [];
  const cropTopics = Array.isArray(post?.cropTopics) ? post.cropTopics.map(getTopicById).filter(Boolean) : [];

  return <div className="sb-journal-page sb-journal-article-page" lang={language}>
    <SEO title={hasPost ? (post.seoTitle || post.title) : copy.guides} description={hasPost ? (post.seoDescription || post.excerpt || post.title) : copy.intro} path={articlePath} noIndex={isMissing} image={coverImage} imageAlt={post?.coverAlt} type="article" language={language} alternates={alternates} structuredData={hasPost ? { '@context': 'https://schema.org', '@graph': [
      { '@type': 'BlogPosting', headline: post.title, description: post.seoDescription || post.excerpt || post.title, url: `${SITE_URL}${articlePath}`, mainEntityOfPage: `${SITE_URL}${articlePath}`, inLanguage: language, ...(publishedDate ? { datePublished: post.publishedAt } : {}), ...(updatedDate ? { dateModified: post.updatedAt } : {}), ...(coverImage ? { image: [coverImage] } : {}), ...(post.category ? { articleSection: post.category } : {}), ...(post.author ? { author: { '@type': post.authorType === 'Organization' ? 'Organization' : 'Person', name: post.author } } : {}), publisher: { '@type': 'Organization', name: 'SahiBhav', url: SITE_URL } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: copy.brand, item: `${SITE_URL}/` }, { '@type': 'ListItem', position: 2, name: copy.guide, item: `${SITE_URL}/blog` }, { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}${articlePath}` }] },
    ] } : undefined} />
    <a className="sb-journal-skip" href="#main-content">{copy.skip}</a>
    <header className="sb-journal-header"><div className="sb-journal-header__inner"><Link to="/" aria-label={copy.home}><Brand /></Link><Link to={blogPath} className="sb-journal-back"><ArrowLeft size={16} aria-hidden="true" />{copy.allGuides}</Link></div></header>
    <main className="sb-journal-article-main" id="main-content">
      <nav className="sb-journal-breadcrumb" aria-label={copy.guide}><Link to="/">{copy.brand}</Link><span aria-hidden="true">/</span><Link to={blogPath}>{copy.guide}</Link><span aria-hidden="true">/</span><span aria-current="page">{post?.category || copy.article}</span></nav>
      {loading && !hasPost && <div className="sb-detail-status" role="status"><RefreshCw size={24} aria-hidden="true" /><h1>{copy.articleLoading}</h1><p>{copy.wait}</p></div>}
      {!loading && !hasPost && <div className="sb-detail-status" role={error ? 'alert' : 'status'}>{error ? <AlertCircle size={32} aria-hidden="true" /> : <BookOpen size={32} aria-hidden="true" />}<h1>{isMissing ? copy.missing : copy.failed}</h1><p>{isMissing ? copy.missingHelp : copy.errorHelp}</p>{!isMissing && <button className="sb-journal-button" type="button" onClick={() => window.location.reload()}>{copy.retry}</button>}<Link to={blogPath} className="sb-detail-text-link">{copy.allArticles} <ArrowRight size={16} aria-hidden="true" /></Link></div>}
      {hasPost && <>
        <article className="sb-journal-article">
          <header className="sb-journal-article-heading">
            <div className="sb-journal-article-context"><span className="sb-journal-category">{post.category || copy.guide}</span>{post.regionLabel && <span className="sb-journal-region"><MapPin size={14} aria-hidden="true" />{copy.region}: {post.regionLabel}</span>}</div>
            <h1>{post.title}</h1>{post.excerpt && <p className="sb-journal-deck">{post.excerpt}</p>}
            <div className="sb-journal-byline">{post.author && <span><UserRound size={15} aria-hidden="true" />{post.author}</span>}{publishedDate && <span><CalendarDays size={15} aria-hidden="true" />{copy.published}: <time dateTime={post.publishedAt}>{publishedDate}</time></span>}{updatedDate && <span>{copy.updated}: <time dateTime={post.updatedAt}>{updatedDate}</time></span>}</div>
            {(post.editorialNote || post.authorType === 'Organization') && <p className="sb-journal-editorial-note">{post.editorialNote || copy.editorial}</p>}
            {translations.length > 1 && <nav className="sb-journal-translations" aria-label={copy.changeLanguage}><span><Languages size={16} aria-hidden="true" />{copy.changeLanguage}</span><div>{translations.map(item => item.language === language ? <span key={item.language} lang={item.language} aria-current="page">{EDITORIAL_LANGUAGES[item.language]}</span> : <Link key={item.language} to={`/blog/${encodeURIComponent(item.slug)}`} lang={item.language} hrefLang={item.language}>{EDITORIAL_LANGUAGES[item.language]}</Link>)}</div></nav>}
          </header>
          <figure className="sb-journal-cover"><EditorialImage src={post.coverImage} alt={post.coverAlt || post.title} language={language} width="1672" height="941" fetchPriority="high" />{post.coverImage && <figcaption>{post.coverCaption || copy.caption}</figcaption>}</figure>
          <div className="sb-journal-reading-layout"><div className="sb-journal-reading-main">
            {takeaways.length > 0 && <section className="sb-journal-takeaways" aria-labelledby="takeaway-title"><span className="sb-journal-eyebrow">{copy.first}</span><h2 id="takeaway-title">{copy.takeaways}</h2><ul>{takeaways.map((item, index) => <li key={index}><Check size={18} aria-hidden="true" /><span>{item}</span></li>)}</ul></section>}
            <div className="sb-article-content sb-journal-prose"><Markdown components={{ h1: ({ children }) => <h2>{children}</h2>, h2: ({ children }) => <h2 id={sectionId(textContent(children))}>{children}</h2>, a: ArticleLink }}>{content}</Markdown></div>
            {post.weatherRelevant && <LocalWeatherLinks language={language} />}
            {priceLinks.length > 0 && <section className="sb-journal-price-links" aria-labelledby="article-prices-title"><h2 id="article-prices-title">{copy.prices}</h2><p>{copy.pricesHelp}</p><div>{priceLinks.map(item => <Link key={item.path} to={item.path}>{item.label}<ArrowRight size={16} aria-hidden="true" /></Link>)}</div></section>}
            {sources.length > 0 && <section className="sb-journal-sources" aria-labelledby="sources-title"><span className="sb-journal-eyebrow">{copy.sourcesKicker}</span><h2 id="sources-title">{copy.sources}</h2><p>{copy.sourcesHelp}</p><ol>{sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={safeSourceUrl(source.url)} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={14} aria-hidden="true" /><span className="sb-journal-sr-only"> ({copy.newTab})</span></a>{source.accessedAt && editorialDate(source.accessedAt, language) && <span>{copy.accessed}: <time dateTime={source.accessedAt}>{editorialDate(source.accessedAt, language)}</time></span>}</li>)}</ol></section>}
            {cropTopics.length > 0 && <nav className="sb-journal-topic-links" aria-label={`${copy.crop} — ${copy.guides}`}>{cropTopics.map(topic => <Link key={topic.id} to={`/blog?${new URLSearchParams({ crop: topic.id, ...(language !== 'hi' ? { language } : {}) })}`}>{editorialCropName(topic.id, topic.nameHi, language)} <ArrowRight size={13} aria-hidden="true" /></Link>)}</nav>}
            {tags.length > 0 && <div className="sb-journal-tags" aria-label={copy.tags}>{tags.map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}</div>}
          </div><aside className="sb-journal-reading-aside">
            {headings.length > 1 && <nav className="sb-journal-contents" aria-label={copy.contents}><h2><List size={17} aria-hidden="true" />{copy.contents}</h2><ol>{headings.map((heading, index) => <li key={`${heading.id}-${index}`}><a href={`#${heading.id}`}>{heading.title}</a></li>)}</ol>{sources.length > 0 && <a className="sb-journal-source-jump" href="#sources-title">{copy.official} <ArrowRight size={14} aria-hidden="true" /></a>}</nav>}
            <div className="sb-journal-tool"><span className="sb-journal-eyebrow">{copy.beforeMarket}</span><h2>{copy.transportHeading}</h2><p>{copy.transportHelp}</p><Link to="/delivery-calculator">{copy.deliveryAction} <ArrowRight size={16} aria-hidden="true" /></Link></div>
          </aside></div>
        </article>
        {relatedPosts.length > 0 && <section className="sb-journal-related" aria-labelledby="related-title"><div className="sb-journal-section-heading"><div><span className="sb-journal-eyebrow">{copy.nextQuestion}</span><h2 id="related-title">{copy.related}</h2></div><Link to={blogPath}>{copy.allArticles} <ArrowRight size={16} aria-hidden="true" /></Link></div><div className="sb-journal-grid">{relatedPosts.map(related => <article className="sb-journal-card" key={related.slug}><Link to={`/blog/${related.slug}`} className="sb-journal-card__image" aria-label={`${related.title} — ${copy.read}`}><EditorialImage src={related.coverImage} alt={related.coverAlt || related.title} language={language} width="1672" height="941" loading="lazy" decoding="async" />{related.coverImage && <span className="sb-journal-image-note">{copy.illustration}</span>}</Link><div className="sb-journal-card__body"><span className="sb-journal-category">{related.category || copy.guide}</span><h3><Link to={`/blog/${related.slug}`}>{related.title}</Link></h3>{related.regionLabel && <span className="sb-journal-region"><MapPin size={13} aria-hidden="true" />{related.regionLabel}</span>}<Link to={`/blog/${related.slug}`} className="sb-journal-card__link" aria-label={`${related.title} — ${copy.read}`}>{copy.read} <ArrowRight size={16} aria-hidden="true" /></Link></div></article>)}</div></section>}
        <footer className="sb-journal-footer"><span>{copy.brand} · {copy.footer}</span><Link to={blogPath}><ArrowLeft size={15} aria-hidden="true" />{copy.allGuides}</Link></footer>
      </>}
    </main>
  </div>;
}
