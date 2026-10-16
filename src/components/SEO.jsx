import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

// Use the domain that is actually deployed. Set VITE_SITE_URL only after a custom
// domain is attached in Vercel; do not point search engines at an unconnected name.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://mandi-ji.vercel.app').replace(/\/$/, '');
const DEFAULTS = {
  title: 'सही भाव — भारत के मंडी भाव | SahiBhav',
  description: 'फसल के दर्ज मंडी भाव देखें, मंडियों की तुलना करें और बिक्री व परिवहन की तैयारी करें। सही भाव — SahiBhav।',
  image: `${SITE_URL}/og-image.png`,
};
const PRIVATE_ROUTES = /^\/(?:admin|login|register|my-listings|my-eway-bills|eway-bill|listing\/new)(?:\/|$)/;

function articleAlternatePath(value) {
  if (typeof value !== 'string' || !value.startsWith('/blog/')) return null;
  try {
    const slug = decodeURIComponent(value.slice(6));
    return /^[\p{L}\p{M}\p{N}]+(?:-[\p{L}\p{M}\p{N}]+)*$/u.test(slug) ? `/blog/${encodeURIComponent(slug)}` : null;
  } catch { return null; }
}

const SCHEMA_JSON = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'SahiBhav',
  alternateName: 'सही भाव',
  url: SITE_URL,
  description: DEFAULTS.description,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  inLanguage: 'hi',
  isAccessibleForFree: true,
  author: { '@type': 'Organization', name: 'SahiBhav', url: SITE_URL },
});

export default function SEO({ title, description, path, noIndex = false, structuredData, image, imageAlt, type = 'website', language = 'hi', alternates = [] }) {
  const { pathname } = useLocation();
  const pageTitle = title ? `${title} | SahiBhav` : DEFAULTS.title;
  const pageDesc = description || DEFAULTS.description;
  const pageImage = image ? new URL(image, SITE_URL).href : DEFAULTS.image;
  const pageImageAlt = imageAlt || 'सही भाव — मंडी भाव और डिलीवरी खर्च';
  const pagePath = (path || pathname).split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const pageUrl = `${SITE_URL}${pagePath.startsWith('/') ? pagePath : `/${pagePath}`}`;
  const robots = noIndex || PRIVATE_ROUTES.test(pathname) ? 'noindex, follow' : 'index, follow, max-image-preview:large';
  const pageLanguage = ['hi', 'mr', 'gu'].includes(language) ? language : 'hi';
  const languageLinks = [...new Map(alternates.filter(item => ['hi', 'mr', 'gu'].includes(item.language) && articleAlternatePath(item.path)).map(item => [item.language, { ...item, path: articleAlternatePath(item.path) }])).values()];

  return (
    <Helmet>
      <html lang={pageLanguage} />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDesc} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={pageUrl} />
      {languageLinks.map(item => <link key={item.language} rel="alternate" hrefLang={item.language} href={`${SITE_URL}${item.path}`} />)}
      {languageLinks.some(item => item.language === 'hi') && <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${languageLinks.find(item => item.language === 'hi').path}`} />}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDesc} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:image:alt" content={pageImageAlt} />
      <meta property="og:locale" content={`${pageLanguage}_IN`} />
      {languageLinks.filter(item => item.language !== pageLanguage).map(item => <meta key={item.language} property="og:locale:alternate" content={`${item.language}_IN`} />)}
      <meta property="og:site_name" content="SahiBhav" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDesc} />
      <meta name="twitter:image" content={pageImage} />
      <meta name="twitter:image:alt" content={pageImageAlt} />
      <script type="application/ld+json">{SCHEMA_JSON}</script>
      {structuredData && <script type="application/ld+json">{JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>}
    </Helmet>
  );
}
