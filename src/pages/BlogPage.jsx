import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Clock3, Leaf, MapPin, Search } from 'lucide-react';
import SEO from '@/components/SEO';
import Brand from '@/components/Brand';
import EditorialImage from '@/components/EditorialImage';
import FarmVisual from '@/components/FarmVisual';
import LocalWeatherLinks from '@/components/LocalWeatherLinks';
import NotFoundPage from './NotFoundPage';
import { useApi } from '@/hooks/useApi';
import { INDIA_REGIONS, getIndiaRegion, normalizeRegionId } from '../../shared/indiaRegions';
import { getCropTopic } from '../../shared/cropTopics';
import { EDITORIAL_LANGUAGES, getEditorialLabels, editorialDate, editorialCropName, editorialStateName, editorialStateLanguage } from '@/utils/editorialLabels';
import { getLanguage } from '../../shared/languages';
import { readLanguageNavigation, buildLanguageChooserUrl, buildLanguageBlogUrl, buildArticleNavigationUrl, localizedToolsUrl } from '@/utils/languageNavigation';
import '@/styles/editorial.css';
import '@/styles/language-fonts.css';

const FILTER_KEYS = ['crop', 'state', 'category', 'q'];
const PAGE_SIZE = 10;

function PostMeta({ post, language }) {
  const copy = getEditorialLabels(language);
  const date = editorialDate(post.updatedAt || post.publishedAt, language);
  return <div className="sb-journal-meta">
    {date && <span><CalendarDays size={14} aria-hidden="true" /><time dateTime={post.updatedAt || post.publishedAt}>{date}</time></span>}
    {post.readingMinutes && <span><Clock3 size={14} aria-hidden="true" />{copy.approx} <bdi>{post.readingMinutes}</bdi> {copy.minutes}</span>}
  </div>;
}

function BlogLibraryPage({ routeLanguage }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const language = routeLanguage || (Object.hasOwn(EDITORIAL_LANGUAGES, searchParams.get('language')) ? searchParams.get('language') : 'hi');
  const libraryPath = buildLanguageBlogUrl(language);
  const copy = getEditorialLabels(language);
  const languageInfo = getLanguage(language);
  const context = readLanguageNavigation(searchParams);
  const marketPath = localizedToolsUrl(context, language);
  const chooserPath = buildLanguageChooserUrl({ ...context, crop: context.sourceCrop, toolLanguage: context.toolLanguage || language });
  const resetPath = buildLanguageBlogUrl(language, { ...context, crop: '', state: '', q: '', category: '', page: '' });
  const articlePath = slug => buildArticleNavigationUrl(slug, context);
  const crop = searchParams.get('crop') || '';
  const state = normalizeRegionId(searchParams.get('state') || '');
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
  const gridPosts = featured ? posts.filter(post => post.slug !== featured.slug) : posts;
  const hasFilters = Boolean(crop || state || category || query);
  const isFilteredUrl = searchParams.size > 0;

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (state) next.set('state', state);
    next.delete('language');
    next.delete('page');
    // Topic labels can differ between languages; keep crop/state intent, reset the category.
    if (key === 'language') next.delete('category');
    else if (value) next.set(key, value); else next.delete(key);
    const destination = key === 'language' ? buildLanguageBlogUrl(value) : libraryPath;
    navigate(`${destination}${next.size ? `?${next}` : ''}`);
  }
  function submitSearch(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    if (context.toolLanguage) next.set('toolLanguage', context.toolLanguage);
    if (context.sourceCrop) next.set('sourceCrop', context.sourceCrop);
    for (const key of FILTER_KEYS) {
      const value = String(form.get(key) || '').trim();
      if (value) next.set(key, value);
    }
    const destination = buildLanguageBlogUrl(String(form.get('language') || language));
    navigate(`${destination}${next.size ? `?${next}` : ''}`);
  }
  function pagePath(nextPage) {
    const next = new URLSearchParams(searchParams);
    if (state) next.set('state', state);
    next.delete('language');
    if (nextPage > 1) next.set('page', String(nextPage)); else next.delete('page');
    return `${libraryPath}${next.size ? `?${next}` : ''}`;
  }

  return <div className={`sb-journal-page sb-language-surface sb-language-script-${languageInfo?.script || 'Devanagari'}`} lang={language} dir={languageInfo?.dir || 'ltr'}>
    <SEO title={`${copy.guides} — ${copy.crop}, ${copy.state}, ${copy.language}`} description={copy.intro} path={libraryPath} noIndex={isFilteredUrl} language={language} image="/visuals/farm-journal-v1.webp" imageAlt={copy.guides} />
    <a className="sb-journal-skip" href="#main-content">{copy.skip}</a>
    <header className="sb-journal-header"><div className="sb-journal-header__inner"><Link to={marketPath} aria-label={copy.home}><Brand /></Link><nav aria-label={copy.navigation}><Link to={chooserPath}>{copy.language}</Link><Link to={marketPath}>{copy.market}</Link><Link to={localizedToolsUrl(context, language, 'delivery')}>{copy.delivery} <ArrowRight size={15} aria-hidden="true" /></Link></nav></div></header>
    <main className="sb-journal-main" id="main-content">
      <section className="sb-journal-intro sb-journal-intro--illustrated" aria-labelledby="journal-title"><div className="sb-journal-intro-copy"><span className="sb-journal-eyebrow"><Leaf size={15} aria-hidden="true" /> {copy.brand} {copy.guide}</span><h1 id="journal-title">{copy.hero}<br /><em>{copy.heroAccent}</em></h1><p>{copy.intro}</p></div><figure className="sb-journal-intro-art"><FarmVisual name="farm-journal-v1" priority sizes="(max-width: 640px) calc(100vw - 32px), 540px" /><figcaption>{copy.illustration}</figcaption></figure></section>
      <div className="sb-journal-scope-strip"><MapPin size={18} aria-hidden="true" /><strong>{copy.regionFocus}</strong><span>{copy.regionHelp}</span></div>
      {language === 'hi' && <nav className="sb-journal-scope-strip" aria-label="खेती की तैयारी के औज़ार"><Link to="/kisan-salah">समस्या के अनुसार लेख चुनें →</Link><Link to={`/kisan-calendar${state ? `?state=${state}` : ''}`}>किसान कैलेंडर →</Link><Link to="/bechne-ka-hisab">कहाँ बेचने पर ज़्यादा बचेगा? →</Link></nav>}

      <section className="sb-journal-discovery" aria-labelledby="discovery-title">
        <h2 id="discovery-title"><Search size={18} aria-hidden="true" />{copy.browse}</h2>
        <form method="get" action={libraryPath} onSubmit={submitSearch} className="sb-journal-search-form">
          {context.toolLanguage && <input type="hidden" name="toolLanguage" value={context.toolLanguage} />}
          {context.sourceCrop && <input type="hidden" name="sourceCrop" value={context.sourceCrop} />}
          <label><span>{copy.crop}</span><select name="crop" value={crop} onChange={event => updateFilter('crop', event.target.value)}><option value="">{copy.allCrops}</option>{crop && !selectedCropInFacets && <option value={crop}>{editorialCropName(selectedTopic?.id || crop, selectedTopic?.nameHi || crop, language)}</option>}{cropFacets.map(item => <option key={item.id} value={item.id}>{editorialCropName(item.id, item.nameHi, language)} ({item.count})</option>)}</select></label>
          <label><span>{copy.state}</span><select name="state" value={state} onChange={event => updateFilter('state', event.target.value)}><option value="">{copy.allStates}</option>{state && !getIndiaRegion(state) && <option value={state} lang="en" dir="ltr">{state}</option>}{INDIA_REGIONS.map(({ id, nameHi }) => <option key={id} value={id} lang={editorialStateLanguage(id, language)} dir={getLanguage(editorialStateLanguage(id, language))?.dir || 'ltr'}>{editorialStateName(id, nameHi, language)}</option>)}</select></label>
          <label><span>{copy.language}</span><select name="language" value={language} onChange={event => updateFilter('language', event.target.value)}>{Object.entries(EDITORIAL_LANGUAGES).map(([id, name]) => <option key={id} value={id} lang={id} dir={getLanguage(id)?.dir || 'ltr'}>{name}{languageFacets.some(item => item.id === id) ? ` (${languageFacets.find(item => item.id === id).count})` : ''}</option>)}</select></label>
          <label><span>{copy.category}</span><select name="category" value={category} onChange={event => updateFilter('category', event.target.value)}><option value="">{copy.allCategories}</option>{category && !categoryFacets.some(item => item.name === category) && <option value={category}>{category}</option>}{categoryFacets.map(item => <option key={item.name} value={item.name}>{item.name} ({item.count})</option>)}</select></label>
          <label className="sb-journal-search-field"><span>{copy.search}</span><input key={query} name="q" type="search" defaultValue={query} maxLength={160} placeholder={copy.searchPlaceholder} /></label>
          <div className="sb-journal-search-actions"><button type="submit" className="sb-journal-button"><Search size={16} aria-hidden="true" />{copy.apply}</button>{hasFilters && <Link to={resetPath}>{copy.reset}</Link>}</div>
        </form>
      </section>

      {featured && <section className="sb-journal-feature" aria-labelledby="featured-title"><Link to={articlePath(featured.slug)} className="sb-journal-feature__image" aria-label={featured.title}><EditorialImage src={featured.coverImage} alt={featured.coverAlt || featured.title} language={language} width="1672" height="941" loading="lazy" decoding="async" sizes="(max-width: 800px) calc(100vw - 32px), 650px" />{featured.coverImage && <span className="sb-journal-image-note">{copy.illustration}</span>}</Link><div className="sb-journal-feature__copy"><span className="sb-journal-eyebrow">{copy.featured}</span>{featured.category && <span className="sb-journal-category">{featured.category}</span>}<h2 id="featured-title"><Link to={articlePath(featured.slug)}>{featured.title}</Link></h2><p>{featured.excerpt}</p>{featured.regionLabel && <span className="sb-journal-region"><MapPin size={13} aria-hidden="true" />{featured.regionLabel}</span>}<PostMeta post={featured} language={language} /><Link to={articlePath(featured.slug)} className="sb-journal-button">{copy.readGuide} <ArrowRight size={18} aria-hidden="true" /></Link></div></section>}

      <section className="sb-journal-library" aria-labelledby="guides-title" aria-busy={loading}>
        <div className="sb-journal-section-heading"><div><span className="sb-journal-eyebrow">{copy.libraryKicker}</span><h2 id="guides-title">{copy.library}</h2></div><span role="status">{!loading && !error ? `${total} ${hasFilters ? copy.result : copy.available}` : ''}</span></div>
        {loading && <div className="sb-journal-status" role="status">{copy.loading}</div>}
        {!loading && posts.length === 0 && <div className="sb-journal-status" role={error ? 'alert' : 'status'}><BookOpen size={30} aria-hidden="true" /><h3>{error ? copy.loadError : copy.empty}</h3><p>{error ? copy.errorHelp : copy.emptyHelp}</p>{hasFilters && <Link className="sb-journal-button" to={resetPath}>{copy.reset}</Link>}{page > 1 && <Link to={pagePath(1)}>{copy.page} 1 <ArrowRight size={15} aria-hidden="true" /></Link>}</div>}
        <div className="sb-journal-grid">{gridPosts.map(post => <article className="sb-journal-card" key={post.slug}><Link to={articlePath(post.slug)} className="sb-journal-card__image" aria-label={`${post.title} — ${copy.read}`}><EditorialImage src={post.coverImage} alt={post.coverAlt || post.title} language={language} width="1672" height="941" loading="lazy" decoding="async" />{post.coverImage && <span className="sb-journal-image-note">{copy.illustration}</span>}</Link><div className="sb-journal-card__body"><span className="sb-journal-category">{post.category || copy.guide}</span><h3><Link to={articlePath(post.slug)}>{post.title}</Link></h3><p>{post.excerpt}</p>{post.regionLabel && <span className="sb-journal-region"><MapPin size={13} aria-hidden="true" />{post.regionLabel}</span>}<PostMeta post={post} language={language} /><Link to={articlePath(post.slug)} className="sb-journal-card__link" aria-label={`${post.title} — ${copy.read}`}>{copy.read} <ArrowRight size={16} aria-hidden="true" /></Link></div></article>)}</div>
        {!loading && !error && totalPages > 1 && posts.length > 0 && <nav className="sb-journal-pagination" aria-label={copy.pagination}>{page > 1 ? <Link to={pagePath(page - 1)} rel="prev"><ArrowLeft size={16} aria-hidden="true" />{copy.previous}</Link> : <span /> }<span aria-current="page">{copy.page} <bdi>{page} / {totalPages}</bdi></span>{page < totalPages ? <Link to={pagePath(page + 1)} rel="next">{copy.next}<ArrowRight size={16} aria-hidden="true" /></Link> : <span />}</nav>}
      </section>
      {['hi', 'mr', 'gu'].includes(language) && <LocalWeatherLinks language={language} />}
      <aside className="sb-journal-method"><BookOpen size={24} aria-hidden="true" /><div><h2>{copy.method}</h2><p>{copy.methodHelp}</p></div></aside>
      <footer className="sb-journal-footer"><span>{copy.brand} · {copy.footer}</span><Link to={marketPath}>{copy.market} <ArrowRight size={15} aria-hidden="true" /></Link></footer>
    </main>
  </div>;
}

export default function BlogPage() {
  const { language } = useParams();
  if (language && !Object.hasOwn(EDITORIAL_LANGUAGES, language)) return <NotFoundPage />;
  return <BlogLibraryPage routeLanguage={language} />;
}
