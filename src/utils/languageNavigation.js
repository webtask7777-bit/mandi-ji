import { getLanguage } from '../../shared/languages.js';
import { EDITORIAL_LANGUAGE_CODES } from '../../shared/editorialLanguages.js';
import { normalizeRegionId } from '../../shared/indiaRegions.js';
import { buildLanguageToolsUrl } from './languageTools.js';
import { cropDetailPath } from './cropUrls.js';

const sourceId = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : '';
const toolCode = value => getLanguage(value)?.status === 'available' ? value : '';
const toolSection = value => ['prices', 'delivery', 'guides'].includes(value) ? value : '';
const articleCode = value => EDITORIAL_LANGUAGE_CODES.includes(value) ? value : 'hi';
const appendQuery = (path, query) => `${path}${query.size ? `?${query}` : ''}`;
const regionId = value => normalizeRegionId(sourceId(value));
const filterText = value => typeof value === 'string' ? [...value].filter(char => char.codePointAt(0) >= 32 && char.codePointAt(0) !== 127).join('').trim().slice(0, 160) : '';
function libraryFilters(context) {
  const filters = {};
  for (const key of ['q', 'category']) if (filterText(context[key])) filters[key] = filterText(context[key]);
  const page = String(context.page || '');
  if (/^\d+$/.test(page) && Number(page) > 1 && Number(page) <= 1000000) filters.page = String(Number(page));
  return filters;
}

// Article language and editorial crop groups are distinct from the exact price
// selection. No return URL is accepted: every destination is constructed locally.
export function readLanguageNavigation(search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search || '');
  return {
    toolLanguage: toolCode(params.get('toolLanguage')),
    state: regionId(params.get('state')),
    sourceCrop: sourceId(params.get('sourceCrop')),
    crop: sourceId(params.get('crop')),
    ...(toolSection(params.get('toolSection')) ? { toolSection: toolSection(params.get('toolSection')) } : {}),
    ...libraryFilters({ q: params.get('q'), category: params.get('category'), page: params.get('page') }),
  };
}

function contextQuery(context = {}) {
  const query = new URLSearchParams();
  if (toolCode(context.toolLanguage)) query.set('toolLanguage', context.toolLanguage);
  if (toolSection(context.toolSection)) query.set('toolSection', context.toolSection);
  if (regionId(context.state) && context.state !== 'all') query.set('state', regionId(context.state));
  if (sourceId(context.sourceCrop)) query.set('sourceCrop', context.sourceCrop);
  if (sourceId(context.crop)) query.set('crop', context.crop);
  for (const [key, value] of Object.entries(libraryFilters(context))) query.set(key, value);
  return query;
}

export function buildLanguageChooserUrl(context = {}) {
  const query = new URLSearchParams();
  if (regionId(context.state) && context.state !== 'all') query.set('state', regionId(context.state));
  const crop = sourceId(context.sourceCrop || context.crop);
  if (crop) query.set('crop', crop);
  if (toolCode(context.toolLanguage)) query.set('toolLanguage', context.toolLanguage);
  if (toolSection(context.toolSection)) query.set('toolSection', context.toolSection);
  return appendQuery('/languages', query);
}

export function buildLanguageBlogUrl(articleLanguage = 'hi', context = {}) {
  const code = articleCode(articleLanguage);
  return appendQuery(code === 'hi' ? '/blog' : `/${code}/blog`, contextQuery(context));
}

export function buildArticleNavigationUrl(slug, context = {}) {
  return appendQuery(`/blog/${encodeURIComponent(slug)}`, contextQuery(context));
}

export function buildHindiCropDetailUrl(crop, state = 'all', language) {
  const query = new URLSearchParams();
  if (toolCode(language)) query.set('toolLanguage', language);
  return appendQuery(cropDetailPath(crop, regionId(state) || 'all'), query);
}

export function dashboardLanguageContext(pathname, search = '') {
  const context = readLanguageNavigation(search);
  const query = new URLSearchParams(search);
  const route = /^\/mandi-bhav\/([^/]+)(?:\/([^/]+))?\/?$/.exec(pathname || '');
  return {
    ...context,
    state: route ? regionId(route[1]) : context.state,
    sourceCrop: sourceId(route?.[2]) || context.sourceCrop || (query.get('tab') === 'naksha' ? sourceId(query.get('mapCrop')) : ''),
  };
}

export function dashboardLanguageSection(pathname, search = '') {
  const tab = new URLSearchParams(search).get('tab');
  return pathname === '/delivery-calculator' || ['delivery', 'logistics'].includes(tab) ? 'delivery' : '';
}

export function localizedToolsUrl(context = {}, fallbackLanguage = 'hi', section = '') {
  const language = toolCode(context.toolLanguage) || toolCode(fallbackLanguage) || 'hi';
  const path = buildLanguageToolsUrl(language, { state: regionId(context.state), crop: sourceId(context.sourceCrop) });
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
