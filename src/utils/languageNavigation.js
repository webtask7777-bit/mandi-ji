import { getLanguage } from '../../shared/languages.js';
import { EDITORIAL_LANGUAGE_CODES } from '../../shared/editorialLanguages.js';
import { buildLanguageToolsUrl } from './languageTools.js';

const sourceId = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : '';
const toolCode = value => getLanguage(value)?.status === 'available' ? value : '';
const articleCode = value => EDITORIAL_LANGUAGE_CODES.includes(value) ? value : 'hi';
const appendQuery = (path, query) => `${path}${query.size ? `?${query}` : ''}`;

// Article language and editorial crop groups are distinct from the exact price
// selection. No return URL is accepted: every destination is constructed locally.
export function readLanguageNavigation(search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search || '');
  return {
    toolLanguage: toolCode(params.get('toolLanguage')),
    state: sourceId(params.get('state')),
    sourceCrop: sourceId(params.get('sourceCrop')),
    crop: sourceId(params.get('crop')),
  };
}

function contextQuery(context = {}) {
  const query = new URLSearchParams();
  if (toolCode(context.toolLanguage)) query.set('toolLanguage', context.toolLanguage);
  if (sourceId(context.state) && context.state !== 'all') query.set('state', context.state);
  if (sourceId(context.sourceCrop)) query.set('sourceCrop', context.sourceCrop);
  if (sourceId(context.crop)) query.set('crop', context.crop);
  return query;
}

export function buildLanguageChooserUrl(context = {}) {
  const query = new URLSearchParams();
  if (sourceId(context.state) && context.state !== 'all') query.set('state', context.state);
  const crop = sourceId(context.sourceCrop || context.crop);
  if (crop) query.set('crop', crop);
  if (toolCode(context.toolLanguage)) query.set('toolLanguage', context.toolLanguage);
  return appendQuery('/languages', query);
}

export function buildLanguageBlogUrl(articleLanguage = 'hi', context = {}) {
  const code = articleCode(articleLanguage);
  return appendQuery(code === 'hi' ? '/blog' : `/${code}/blog`, contextQuery(context));
}

export function buildArticleNavigationUrl(slug, context = {}) {
  return appendQuery(`/blog/${encodeURIComponent(slug)}`, contextQuery(context));
}

export function localizedToolsUrl(context = {}, fallbackLanguage = 'hi', section = '') {
  const language = toolCode(context.toolLanguage) || toolCode(fallbackLanguage) || 'hi';
  const path = buildLanguageToolsUrl(language, { state: sourceId(context.state), crop: sourceId(context.sourceCrop) });
  return `${path}${['prices', 'delivery', 'guides'].includes(section) ? `#language-${section}` : ''}`;
}

export function localizedPriceUrl(path, context = {}, fallbackLanguage = 'hi') {
  if (typeof path !== 'string') return null;
  const national = /^\/crop\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
  const regional = /^\/mandi-bhav\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/([a-z0-9]+(?:-[a-z0-9]+)*))?$/.exec(path);
  if (!national && !regional) return null;
  return localizedToolsUrl({
    ...context,
    state: regional ? regional[1] : context.state,
    sourceCrop: national?.[1] || regional?.[2] || '',
  }, fallbackLanguage, 'prices');
}

export function editorialNavigationUrl(href, context = {}, fallbackLanguage = 'hi') {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return href;
  const url = new URL(href, 'https://navigation.invalid');
  if (url.origin !== 'https://navigation.invalid') return null;
  const price = localizedPriceUrl(url.pathname, context, fallbackLanguage);
  if (price) return price;
  if (url.pathname === '/delivery-calculator') return localizedToolsUrl(context, fallbackLanguage, 'delivery');
  if (url.pathname === '/languages') return buildLanguageChooserUrl(context);
  const nativeLibrary = /^\/([^/]+)\/blog$/.exec(url.pathname);
  if (url.pathname !== '/blog' && !nativeLibrary && !/^\/blog\/[^/]+$/.test(url.pathname)) return href;
  const next = contextQuery(context);
  // An explicit destination filter takes precedence over the originating filter.
  for (const [key, value] of url.searchParams) next.set(key, value);
  if (url.pathname === '/blog' || nativeLibrary) {
    const language = articleCode(nativeLibrary?.[1] || next.get('language') || fallbackLanguage);
    next.delete('language');
    return `${appendQuery(buildLanguageBlogUrl(language), next)}${url.hash}`;
  }
  return `${appendQuery(url.pathname, next)}${url.hash}`;
}
