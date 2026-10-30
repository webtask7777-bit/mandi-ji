import { EDITORIAL_LANGUAGE_CODES } from './editorialLanguages.js';

export const BLOG_PAGE_SIZE = 10;
export const BLOG_FILTER_KEYS = ['crop', 'state', 'category', 'q'];

export function blogPageNumber(value) {
  const text = String(value ?? '');
  return /^[1-9]\d{0,5}$/.test(text) ? Number(text) : null;
}

export function blogLibraryPath(language = 'hi', page = 1) {
  const code = EDITORIAL_LANGUAGE_CODES.includes(language) ? language : 'hi';
  const base = code === 'hi' ? '/blog' : `/${code}/blog`;
  return page > 1 ? `${base}/page/${page}` : base;
}

export function parseBlogLibraryPath(pathname) {
  const match = /^\/(?:(?<language>[a-z]{2,3})\/)?blog(?:\/page\/(?<page>[1-9]\d{0,5}))?$/.exec(pathname);
  if (!match) return null;
  const language = match.groups.language || 'hi';
  if (!EDITORIAL_LANGUAGE_CODES.includes(language)) return null;
  return { language, page: Number(match.groups.page || 1), explicitPage: Boolean(match.groups.page) };
}

// Only content filters belong in the filtered view's canonical. Navigation
// context and tracking parameters do not create another editorial collection.
export function blogCanonicalSearch(params) {
  const input = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  const query = new URLSearchParams();
  for (const key of BLOG_FILTER_KEYS) {
    const value = String(input.get(key) || '').trim().slice(0, 160);
    if (value && !(key === 'state' && value === 'all')) query.set(key, value);
  }
  return query.toString();
}

export function blogRedirectPath(pathname, params) {
  const route = parseBlogLibraryPath(pathname);
  if (!route) return null;
  const query = new URLSearchParams(params);
  const language = pathname.startsWith('/blog') && EDITORIAL_LANGUAGE_CODES.includes(query.get('language')) ? query.get('language') : route.language;
  const page = route.explicitPage ? route.page : blogPageNumber(query.get('page')) || 1;
  const destination = blogLibraryPath(language, page);
  const hadAlias = query.has('page') || query.has('language');
  query.delete('page');
  query.delete('language');
  if (destination === pathname && !hadAlias) return null;
  return `${destination}${query.size ? `?${query}` : ''}`;
}
