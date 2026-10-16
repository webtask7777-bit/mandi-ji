import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Clock3, Leaf, MapPin, Search } from 'lucide-react';
import SEO from '@/components/SEO';
import Brand from '@/components/Brand';
import EditorialImage from '@/components/EditorialImage';
import LocalWeatherLinks from '@/components/LocalWeatherLinks';
import { useApi } from '@/hooks/useApi';
import { STATE_NAMES } from '@/context/StateContext';
import { getCropTopic } from '../../shared/cropTopics';
import { EDITORIAL_LANGUAGES, getEditorialLabels, editorialDate, editorialCropName, editorialStateName, blogLanguagePath } from '@/utils/editorialLabels';
import '@/styles/editorial.css';

const FILTER_KEYS = ['crop', 'state', 'language', 'category', 'q'];
const PAGE_SIZE = 10;

function PostMeta({ post, language }) {
  const copy = getEditorialLabels(language);
  const date = editorialDate(post.updatedAt || post.publishedAt, language);
  return <div className="sb-journal-meta">
    {date && <span><CalendarDays size={14} aria-hidden="true" /><time dateTime={post.updatedAt || post.publishedAt}>{date}</time></span>}
    {post.readingMinutes && <span><Clock3 size={14} aria-hidden="true" />{copy.approx} {post.readingMinutes} {copy.minutes}</span>}
  </div>;
}

export default function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const language = Object.hasOwn(EDITORIAL_LANGUAGES, searchParams.get('language')) ? searchParams.get('language') : 'hi';
  const copy = getEditorialLabels(language);
  const crop = searchParams.get('crop') || '';
  const state = searchParams.get('state') || '';
  const category = searchParams.get('category') || '';
  const query = searchParams.get('q') || '';
  const page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1);
  const apiQuery = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (language !== 'hi') apiQuery.set('language', language);
  for (const [key, value] of Object.entries({ crop, state, category, q: query })) if (value) apiQuery.set(key, value);
  const { data, loading, error } = useApi(`/cms/blog?${apiQuery}`);
  const posts = Array.isArray(data?.posts) ? data.posts : [];
  const total = Number.isFinite(data?.total) ? data.total : 0;
  const totalPages = Math.max(1, Number(data?.totalPages) || 1);
  const facets = data?.facets || {};
  const cropFacets = Array.isArray(facets.crops) ? facets.crops : [];
  const categoryFacets = Array.isArray(facets.categories) ? facets.categories : [];
  const languageFacets = Array.isArray(facets.languages) ? facets.languages : [];
  const selectedTopic = getCropTopic(crop);
  const selectedCropInFacets = cropFacets.some(item => item.id === crop);
  const featured = page === 1 ? (posts.find(post => post.coverImage) || posts[0]) : null;
  const hasFilters = Boolean(crop || state || category || query);
  const isFilteredUrl = searchParams.size > 0;

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value && !(key === 'language' && value === 'hi')) next.set(key, value); else next.delete(key);
    next.delete('page');
    // Topic labels can differ between languages; keep crop/state intent, reset the category.
    if (key === 'language') next.delete('category');
    setSearchParams(next);
  }
  function submitSearch(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = String(form.get(key) || '').trim();
      if (value && !(key === 'language' && value === 'hi')) next.set(key, value);
    }
    setSearchParams(next);
  }
  function pagePath(nextPage) {
    const next = new URLSearchParams(searchParams);
    if (nextPage > 1) next.set('page', String(nextPage)); else next.delete('page');
    return `/blog${next.size ? `?${next}` : ''}`;
  }

  return <div className="sb-journal-page" lang={language}>
    <SEO title={`${copy.guides} — ${copy.crop}, ${copy.state}, ${copy.language}`} description={copy.intro} path="/blog" noIndex={isFilteredUrl} language={language} image="/editorial/journal-overview.webp" imageAlt="खेती से मंडी तक — फसल, मौसम और बिक्री की सही भाव मार्गदर्शिकाएँ" />
    <a className="sb-journal-skip" href="#main-content">{copy.skip}</a>
    <header className="sb-journal-header"><div className="sb-journal-header__inner"><Link to="/" aria-label={copy.home}><Brand /></Link><nav aria-label={copy.navigation}><Link to="/languages">{copy.language}</Link><Link to="/">{copy.market}</Link><Link to="/delivery-calculator">{copy.delivery} <ArrowRight size={15} aria-hidden="true" /></Link></nav></div></header>
    <main className="sb-journal-main" id="main-content">
      <section className="sb-journal-intro" aria-labelledby="journal-title"><div><span className="sb-journal-eyebrow"><Leaf size={15} aria-hidden="true" /> {copy.brand} {copy.guide}</span><h1 id="journal-title">{copy.hero}<br /><em>{copy.heroAccent}</em></h1><p>{copy.intro}</p></div><div className="sb-journal-focus"><MapPin size={18} aria-hidden="true" /><div><strong>{copy.regionFocus}</strong><span>{copy.regionHelp}</span></div></div></section>

      <section className="sb-journal-discovery" aria-labelledby="discovery-title">
        <h2 id="discovery-title"><Search size={18} aria-hidden="true" />{copy.browse}</h2>
        <form method="get" action="/blog" onSubmit={submitSearch} className="sb-journal-search-form">
          <label><span>{copy.crop}</span><select name="crop" value={crop} onChange={event => updateFilter('crop', event.target.value)}><option value="">{copy.allCrops}</option>{crop && !selectedCropInFacets && <option value={crop}>{editorialCropName(selectedTopic?.id || crop, selectedTopic?.nameHi || crop, language)}</option>}{cropFacets.map(item => <option key={item.id} value={item.id}>{editorialCropName(item.id, item.nameHi, language)} ({item.count})</option>)}</select></label>
          <label><span>{copy.state}</span><select name="state" value={state} onChange={event => updateFilter('state', event.target.value)}><option value="">{copy.allStates}</option>{state && !Object.hasOwn(STATE_NAMES, state) && <option value={state}>{state}</option>}{Object.entries(STATE_NAMES).map(([id, name]) => <option key={id} value={id}>{editorialStateName(id, name, language)}</option>)}</select></label>
          <label><span>{copy.language}</span><select name="language" value={language} onChange={event => updateFilter('language', event.target.value)}>{Object.entries(EDITORIAL_LANGUAGES).map(([id, name]) => <option key={id} value={id}>{name}{languageFacets.some(item => item.id === id) ? ` (${languageFacets.find(item => item.id === id).count})` : ''}</option>)}</select></label>
          <label><span>{copy.category}</span><select name="category" value={category} onChange={event => updateFilter('category', event.target.value)}><option value="">{copy.allCategories}</option>{category && !categoryFacets.some(item => item.name === category) && <option value={category}>{category}</option>}{categoryFacets.map(item => <option key={item.name} value={item.name}>{item.name} ({item.count})</option>)}</select></label>
          <label className="sb-journal-search-field"><span>{copy.search}</span><input key={query} name="q" type="search" defaultValue={query} maxLength={160} placeholder={copy.searchPlaceholder} /></label>
          <div className="sb-journal-search-actions"><button type="submit" className="sb-journal-button"><Search size={16} aria-hidden="true" />{copy.apply}</button>{hasFilters && <Link to={blogLanguagePath(language)}>{copy.reset}</Link>}</div>
        </form>
      </section>

      {featured && <section className="sb-journal-feature" aria-labelledby="featured-title"><Link to={`/blog/${featured.slug}`} className="sb-journal-feature__image" aria-label={featured.title}><EditorialImage src={featured.coverImage} alt={featured.coverAlt || featured.title} language={language} width="1672" height="941" fetchPriority="high" sizes="(max-width: 800px) calc(100vw - 32px), 650px" />{featured.coverImage && <span className="sb-journal-image-note">{copy.illustration}</span>}</Link><div className="sb-journal-feature__copy"><span className="sb-journal-eyebrow">{copy.featured}</span>{featured.category && <span className="sb-journal-category">{featured.category}</span>}<h2 id="featured-title"><Link to={`/blog/${featured.slug}`}>{featured.title}</Link></h2><p>{featured.excerpt}</p>{featured.regionLabel && <span className="sb-journal-region"><MapPin size={13} aria-hidden="true" />{featured.regionLabel}</span>}<PostMeta post={featured} language={language} /><Link to={`/blog/${featured.slug}`} className="sb-journal-button">{copy.readGuide} <ArrowRight size={18} aria-hidden="true" /></Link></div></section>}

      <section className="sb-journal-library" aria-labelledby="guides-title" aria-busy={loading}>
        <div className="sb-journal-section-heading"><div><span className="sb-journal-eyebrow">{copy.libraryKicker}</span><h2 id="guides-title">{copy.library}</h2></div><span role="status">{!loading && !error ? `${total} ${hasFilters ? copy.result : copy.available}` : ''}</span></div>
        {loading && <div className="sb-journal-status" role="status">{copy.loading}</div>}
        {!loading && posts.length === 0 && <div className="sb-journal-status" role={error ? 'alert' : 'status'}><BookOpen size={30} aria-hidden="true" /><h3>{error ? copy.loadError : copy.empty}</h3><p>{error ? copy.errorHelp : copy.emptyHelp}</p>{hasFilters && <Link className="sb-journal-button" to={blogLanguagePath(language)}>{copy.reset}</Link>}{page > 1 && <Link to={pagePath(1)}>{copy.page} 1 <ArrowRight size={15} aria-hidden="true" /></Link>}</div>}
        <div className="sb-journal-grid">{posts.map(post => <article className="sb-journal-card" key={post.slug}><Link to={`/blog/${post.slug}`} className="sb-journal-card__image" aria-label={`${post.title} — ${copy.read}`}><EditorialImage src={post.coverImage} alt={post.coverAlt || post.title} language={language} width="1672" height="941" loading="lazy" decoding="async" />{post.coverImage && <span className="sb-journal-image-note">{copy.illustration}</span>}</Link><div className="sb-journal-card__body"><span className="sb-journal-category">{post.category || copy.guide}</span><h3><Link to={`/blog/${post.slug}`}>{post.title}</Link></h3><p>{post.excerpt}</p>{post.regionLabel && <span className="sb-journal-region"><MapPin size={13} aria-hidden="true" />{post.regionLabel}</span>}<PostMeta post={post} language={language} /><Link to={`/blog/${post.slug}`} className="sb-journal-card__link" aria-label={`${post.title} — ${copy.read}`}>{copy.read} <ArrowRight size={16} aria-hidden="true" /></Link></div></article>)}</div>
        {!loading && !error && totalPages > 1 && posts.length > 0 && <nav className="sb-journal-pagination" aria-label={copy.pagination}>{page > 1 ? <Link to={pagePath(page - 1)} rel="prev"><ArrowLeft size={16} aria-hidden="true" />{copy.previous}</Link> : <span /> }<span aria-current="page">{copy.page} {page} / {totalPages}</span>{page < totalPages ? <Link to={pagePath(page + 1)} rel="next">{copy.next}<ArrowRight size={16} aria-hidden="true" /></Link> : <span />}</nav>}
      </section>
      <LocalWeatherLinks language={language} />
      <aside className="sb-journal-method"><BookOpen size={24} aria-hidden="true" /><div><h2>{copy.method}</h2><p>{copy.methodHelp}</p></div></aside>
      <footer className="sb-journal-footer"><span>{copy.brand} · {copy.footer}</span><Link to="/">{copy.market} <ArrowRight size={15} aria-hidden="true" /></Link></footer>
    </main>
  </div>;
}
