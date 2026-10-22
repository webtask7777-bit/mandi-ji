import { CROP_TOPICS, getCropTopic, getTopicById } from '../../shared/cropTopics.js';
import { INDIA_STATES } from '../../src/data/india-states.js';
import { EDITORIAL_LANGUAGE_CODES } from '../../shared/editorialLanguages.js';

export const EDITORIAL_LANGUAGES = EDITORIAL_LANGUAGE_CODES;
const STATE_IDS = new Set([...INDIA_STATES.map(state => state.id), 'ladakh', 'dadra-daman', 'dadra-nagar-haveli-daman-diu']);
const COMMODITY_IDS = new Set(CROP_TOPICS.flatMap(topic => topic.commodityIds));
const EDITORIAL_AUTHOR = 'सही भाव संपादकीय';
const EDITABLE_FIELDS = [
  'title', 'slug', 'content', 'excerpt', 'tags', 'status', 'category', 'seoTitle',
  'seoDescription', 'coverImage', 'coverAlt', 'coverCaption', 'takeaways', 'sources',
  'relatedSlugs', 'readingMinutes', 'cropTopics', 'stateIds', 'language', 'translationGroup',
  'regionLabel', 'weatherRelevant', 'editorialNote', 'priceLinks',
];
const hasText = value => typeof value === 'string' && Boolean(value.trim());
const valueOf = value => typeof value === 'string' ? value.trim() : '';
const languageOf = post => post.language || 'hi';
const unique = values => [...new Set(values)];
const summaryOf = post => {
  const summary = { ...post };
  delete summary.content;
  return summary;
};
const normalizedBody = text => valueOf(text).normalize('NFKC').replace(/\s+/gu, ' ').toLocaleLowerCase();
const published = post => post.status === 'published' && hasText(post.content);
const stateMatches = (post, state) => !state || !post.stateIds?.length || post.stateIds.includes(state);
const dateValue = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value.slice(0, 10) ? parsed : NaN;
};
const todayIndia = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));

// Keep vowel marks: removing Unicode marks would change Indian-language words.
// Chandrabindu/anusvara and invisible joiner variants are common keyboard differences.
function searchText(value) {
  return valueOf(value).normalize('NFKC').toLocaleLowerCase()
    .replace(/[\u200c\u200d]/gu, '').replace(/\u0901/gu, '\u0902')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/gu, ' ').trim();
}

// These are search equivalents, not diagnoses or mappings between crop products.
// A result still needs to contain an equivalent word in its visible editorial text.
const SEARCH_EQUIVALENTS = [
  ['फफूँद', 'फफूंद', 'mould', 'mold'],
  ['अंकुरण', 'germination', 'sprouting'],
  ['पत्तियों', 'पत्तियाँ', 'पत्तियां', 'पत्ती', 'leaf', 'leaves'],
  ['पाला', 'पाले', 'frost'],
  ['बारिश', 'वर्षा', 'rain', 'rainfall'],
  ['ओलावृष्टि', 'ओले', 'hail', 'hailstorm'],
  ['भीगा', 'भीगी', 'भीगे', 'भीगना', 'भीगने', 'wet'],
  ['नमी', 'moisture'],
  ['भंडारण', 'storage'],
  ['सिंचाई', 'irrigation'],
  ['बुवाई', 'बुआई', 'sowing'],
  ['कटाई', 'harvest', 'harvesting'],
  ['ढुलाई', 'परिवहन', 'transport', 'transportation', 'delivery'],
  ['गेहूँ', 'गेहूं', 'wheat'],
  ['धान', 'paddy'],
  ['टमाटर', 'tomato', 'tomatoes'],
];
const SEARCH_ALIASES = new Map(SEARCH_EQUIVALENTS.flatMap(group => {
  const words = unique(group.map(searchText));
  return words.map(word => [word, words]);
}));
const SEARCH_CONNECTORS = new Set([
  'का', 'की', 'के', 'में', 'से', 'और', 'को', 'पर', 'है', 'हैं', 'हो', 'क्या', 'कैसे', 'करें', 'लिए', 'करना',
  'the', 'a', 'an', 'and', 'in', 'of', 'for', 'to', 'is', 'how', 'what', 'with',
].map(searchText));

function searchTerms(query) {
  const words = unique(searchText(valueOf(query).slice(0, 250)).split(' ').filter(Boolean));
  const meaningful = words.filter(word => !SEARCH_CONNECTORS.has(word));
  return (meaningful.length ? meaningful : words).map(word => SEARCH_ALIASES.get(word) || [word]);
}

function editorialSearchScore(post, terms) {
  // Index reader-visible text, not Markdown link destinations or source URL fragments.
  const body = valueOf(post.content).replace(/!?\[([^\]]*)\]\([^)]*\)/gu, '$1').replace(/https?:\/\/\S+/gu, '');
  const fields = [
    [post.title, 8],
    [[post.excerpt, post.category, ...(post.tags || [])].join(' '), 4],
    [(post.takeaways || []).join(' '), 2],
    [body, 1],
  ].map(([text, weight]) => ({ words: new Set(searchText(text).split(' ')), weight }));
  let score = 0;
  for (const equivalents of terms) {
    const match = fields.find(field => equivalents.some(word => field.words.has(word)));
    if (!match) return 0; // Never silently drop an unmatched crop or symptom.
    score += match.weight;
  }
  return score;
}

function boundedInteger(value, fallback, max) {
  const text = typeof value === 'number' ? String(value) : valueOf(value);
  if (!/^\d+$/.test(text)) return fallback;
  const number = Number(text);
  return Number.isFinite(number) && number >= 1 ? Math.min(number, max) : fallback;
}

function countBy(posts, getValues) {
  const counts = new Map();
  for (const post of posts) {
    for (const value of unique(getValues(post))) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function isPricePath(value) {
  if (typeof value !== 'string') return false;
  const crop = /^\/crop\/([a-z0-9-]+)$/.exec(value);
  if (crop) return COMMODITY_IDS.has(crop[1]);
  const state = /^\/mandi-bhav\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/.exec(value);
  return Boolean(state && STATE_IDS.has(state[1]) && (!state[2] || COMMODITY_IDS.has(state[2])));
}

/** Filters the complete collection before pagination; source crop IDs resolve only through curated topics. */
export function listEditorialPosts(allPosts, query = {}) {
  const state = valueOf(query.state) === 'all' ? '' : valueOf(query.state);
  const language = query.language == null || query.language === '' ? 'hi' : valueOf(query.language);
  const available = allPosts.filter(published).filter(post => stateMatches(post, state));
  const inLanguage = available.filter(post => languageOf(post) === language);
  const cropCounts = countBy(inLanguage, post => post.cropTopics || []);
  const categoryCounts = countBy(inLanguage, post => hasText(post.category) ? [post.category] : []);
  const languageCounts = countBy(available, post => [languageOf(post)]);
  const crop = valueOf(query.crop);
  const topic = crop ? getCropTopic(crop) : null;
  const category = valueOf(query.category);
  const search = searchTerms(query.q);
  const slugs = valueOf(query.slugs).split(',').map(value => value.trim()).filter(Boolean).slice(0, 20);
  const matching = inLanguage.filter(post => {
    if (crop && (!topic || !post.cropTopics?.includes(topic.id))) return false;
    if (category && post.category !== category) return false;
    if (slugs.length && !slugs.includes(post.slug)) return false;
    return true;
  }).map(post => ({ post, score: search.length ? editorialSearchScore(post, search) : 1 }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || (Date.parse(b.post.publishedAt) || 0) - (Date.parse(a.post.publishedAt) || 0) || a.post.slug.localeCompare(b.post.slug))
    .map(({ post }) => post);
  const page = boundedInteger(query.page, 1, 1000000);
  const limit = boundedInteger(query.limit, 10, 50);
  return {
    posts: matching.slice((page - 1) * limit, page * limit).map(summaryOf),
    total: matching.length,
    page,
    totalPages: Math.ceil(matching.length / limit),
    facets: {
      crops: CROP_TOPICS.filter(topic => cropCounts.has(topic.id)).map(({ id, nameHi }) => ({ id, nameHi, count: cropCounts.get(id) })),
      categories: [...categoryCounts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, 'hi')),
      languages: EDITORIAL_LANGUAGES.filter(id => languageCounts.has(id)).map(id => ({ id, count: languageCounts.get(id) })),
    },
  };
}

export function getEditorialPost(allPosts, slug) {
  const post = allPosts.find(item => item.slug === slug && published(item));
  if (!post) return null;
  const available = allPosts.filter(published);
  const bySlug = new Map(available.filter(item => languageOf(item) === languageOf(post)).map(item => [item.slug, item]));
  return {
    ...post,
    relatedPosts: unique(post.relatedSlugs || []).filter(item => item !== post.slug).map(item => bySlug.get(item)).filter(Boolean).map(summaryOf),
    translations: post.translationGroup ? available
      .filter(item => item.translationGroup === post.translationGroup)
      .map(item => ({ slug: item.slug, title: item.title, language: languageOf(item) })) : [],
  };
}

/** Shared publication checks for the admin API and the build-time editorial gate. */
export function validateEditorialPost(post, allPosts = [], { now = Date.now() } = {}) {
  const errors = [];
  const isPublished = post.status === 'published';
  const otherPosts = allPosts.filter(item => item.id !== post.id);
  if (!hasText(post.title)) errors.push('लेख का शीर्षक ज़रूरी है।');
  if (!hasText(post.slug) || !/^[\p{L}\p{M}\p{N}]+(?:-[\p{L}\p{M}\p{N}]+)*$/u.test(post.slug)) errors.push('Slug में केवल अक्षर, अंक और बीच में hyphen रखें।');
  if (otherPosts.some(item => item.slug === post.slug)) errors.push('यह slug पहले से मौजूद है।');
  if (!['draft', 'published'].includes(post.status)) errors.push('लेख का status draft या published होना चाहिए।');
  if (!EDITORIAL_LANGUAGES.includes(post.language)) errors.push(`समर्थित भाषा चुनें: ${EDITORIAL_LANGUAGES.join(', ')}।`);
  for (const [field, lookup, label] of [['cropTopics', getTopicById, 'फसल समूह'], ['stateIds', id => STATE_IDS.has(id), 'राज्य']]) {
    if (!Array.isArray(post[field]) || post[field].some(id => typeof id !== 'string' || !lookup(id))) errors.push(`${label} की सूची में केवल मान्य ID रखें।`);
  }
  if (post.translationGroup != null && (!hasText(post.translationGroup) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.translationGroup))) errors.push('Translation group में छोटे अंग्रेज़ी अक्षर, अंक और hyphen रखें।');
  if (post.translationGroup && otherPosts.some(item => item.translationGroup === post.translationGroup && languageOf(item) === post.language)) errors.push('इस translation group में इस भाषा का लेख पहले से है।');
  if (post.author !== EDITORIAL_AUTHOR || post.authorType !== 'Organization') errors.push('लेख की byline सही भाव संपादकीय संस्था के नाम से होनी चाहिए।');
  if (post.weatherRelevant != null && typeof post.weatherRelevant !== 'boolean') errors.push('weatherRelevant का मान true या false होना चाहिए।');
  for (const field of ['regionLabel', 'editorialNote']) if (post[field] != null && typeof post[field] !== 'string') errors.push(`${field} text होना चाहिए।`);
  if (post.priceLinks != null && (!Array.isArray(post.priceLinks) || post.priceLinks.some(link => !hasText(link?.label) || !isPricePath(link?.path)))) errors.push('भाव के links में label और मान्य स्थानीय फसल या राज्य पेज का path रखें।');
  for (const field of ['tags', 'takeaways', 'relatedSlugs']) {
    if (post[field] != null && (!Array.isArray(post[field]) || post[field].some(item => !hasText(item)))) errors.push(`${field} में केवल non-empty text की सूची रखें।`);
  }
  if (typeof post.content !== 'string') errors.push('लेख का content text होना चाहिए।');
  if (!isPublished) return errors;
  for (const field of ['content', 'excerpt', 'seoTitle', 'seoDescription', 'category', 'coverAlt', 'regionLabel']) {
    if (!hasText(post[field])) errors.push(`प्रकाशित लेख में ${field} ज़रूरी है।`);
  }
  if (!hasText(post.coverImage) || !/^\/(?!\/)[a-zA-Z0-9_/-]+\.(?:webp|png|jpe?g|avif|svg)$/.test(post.coverImage) || post.coverImage.includes('..')) errors.push('लेख की thumbnail का मान्य local image path दें।');
  if (!Array.isArray(post.sources) || !post.sources.length) errors.push('प्रकाशन से पहले कम से कम एक वास्तविक स्रोत जोड़ें।');
  else for (const source of post.sources) {
    let url;
    try { url = new URL(source?.url); } catch { /* reported below */ }
    if (!hasText(source?.title) || url?.protocol !== 'https:' || url?.username || url?.password) errors.push('हर स्रोत में शीर्षक और मान्य HTTPS URL होना चाहिए।');
    const accessed = source?.accessedAt;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(accessed || '') || !Number.isFinite(Date.parse(accessed)) || new Date(accessed).toISOString().slice(0, 10) !== accessed || accessed > todayIndia(now)) errors.push('स्रोत की जाँच की तारीख सही और भविष्य की नहीं होनी चाहिए।');
  }
  const created = dateValue(post.createdAt), updated = dateValue(post.updatedAt), firstPublished = dateValue(post.publishedAt);
  if (![created, updated, firstPublished].every(Number.isFinite) || created > firstPublished || firstPublished > updated || updated > Number(now)) errors.push('प्रकाशन और update की तारीखें सही क्रम में और वर्तमान समय तक होनी चाहिए।');
  const body = normalizedBody(post.content);
  if (body && otherPosts.some(item => item.status === 'published' && languageOf(item) === post.language && normalizedBody(item.content) === body)) errors.push('इसी भाषा में यही लेख पहले से प्रकाशित है; नाम बदलकर duplicate प्रकाशित न करें।');
  for (const slug of post.relatedSlugs || []) {
    if (slug === post.slug || !otherPosts.some(item => item.slug === slug && published(item) && languageOf(item) === post.language)) errors.push(`संबंधित लेख प्रकाशित और इसी भाषा में होना चाहिए: ${slug}`);
  }
  return unique(errors);
}

/** Accept only editorial fields. Identity, attribution and timestamps are controlled by the server. */
export function prepareEditorialPost(input, { existing = null, posts = [], now = Date.now(), id } = {}) {
  const timestamp = new Date(now).toISOString();
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const post = existing ? { ...existing } : {
    id, title: '', slug: '', content: '', excerpt: '', tags: [], status: 'draft',
    category: '', seoTitle: '', seoDescription: '', coverImage: '', coverAlt: '',
    coverCaption: '', takeaways: [], sources: [], relatedSlugs: [], cropTopics: [],
    stateIds: [], language: 'hi', translationGroup: null, author: EDITORIAL_AUTHOR,
    authorType: 'Organization', createdAt: timestamp, updatedAt: timestamp, publishedAt: null,
  };
  for (const field of EDITABLE_FIELDS) {
    if (Object.hasOwn(body, field)) post[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
  }
  if (!post.slug && hasText(post.title)) post.slug = post.title.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  const changed = !existing || EDITABLE_FIELDS.some(field => JSON.stringify(post[field]) !== JSON.stringify(existing[field]));
  if (changed) post.updatedAt = timestamp;
  if (post.status === 'published' && !post.publishedAt) post.publishedAt = timestamp;
  const errors = [];
  if ((Object.hasOwn(body, 'author') && body.author !== post.author) || (Object.hasOwn(body, 'authorType') && body.authorType !== 'Organization') || Object.hasOwn(body, 'reviewer') || Object.hasOwn(body, 'reviewedBy')) errors.push('मनमानी लेखक या expert reviewer byline नहीं जोड़ सकते।');
  for (const field of ['createdAt', 'updatedAt', 'publishedAt']) {
    if (body[field] != null && (!Number.isFinite(dateValue(body[field])) || dateValue(body[field]) > Number(now))) errors.push(`${field} की तारीख अमान्य या भविष्य की है।`);
  }
  return { post, changed, errors: unique([...errors, ...validateEditorialPost(post, posts, { now })]) };
}
