import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { EDITORIAL_LANGUAGE_CODES } from '../shared/editorialLanguages.js';
import { getEditorialLabels, editorialCropName } from '../src/utils/editorialLabels.js';
import { getEditorialPost, listEditorialPosts, validateEditorialPost } from '../server/utils/editorial.js';

const posts = JSON.parse(readFileSync(new URL('../server/db/data/blog-posts.json', import.meta.url), 'utf8'));
const translations = posts.filter(post => post.translationGroup === 'tomato-sale-delivery');
const original = translations.find(post => post.language === 'hi');
const newCodes = EDITORIAL_LANGUAGE_CODES.filter(code => !['hi', 'mr', 'gu'].includes(code));

test('every advertised editorial language has a complete interface and an actual published guide', () => {
  const keys = Object.keys(getEditorialLabels('hi')).sort();
  for (const code of EDITORIAL_LANGUAGE_CODES) {
    const copy = getEditorialLabels(code);
    assert.deepEqual(Object.keys(copy).sort(), keys, `${code}: complete UI schema`);
    assert.equal(copy.locale.split('-')[0], code, `${code}: no silent Hindi UI fallback`);
    assert.ok(Object.values(copy).every(value => typeof value === 'string' && value.trim()));
    const listing = listEditorialPosts(posts, { language: code, crop: 'tomato' });
    assert.equal(listing.total, 1, `${code}: one real tomato guide, no fabricated duplicates`);
    assert.ok(listing.posts.every(post => post.language === code));
    const post = translations.find(item => item.language === code);
    assert.deepEqual(validateEditorialPost(post, posts), [], code);
    const detail = getEditorialPost(posts, post.slug);
    assert.deepEqual(detail.translations.map(item => item.language).sort(), [...EDITORIAL_LANGUAGE_CODES].sort());
    assert.ok(editorialCropName('tomato', 'टमाटर', code));
  }
  assert.equal(listEditorialPosts(posts, { language: 'sat' }).total, 0, 'pending languages do not borrow Hindi articles');
});

test('new translations retain source evidence and all decision-changing arithmetic', () => {
  const zeroes = [0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66];
  for (const code of newCodes) {
    const post = translations.find(item => item.language === code);
    assert.deepEqual(post.sources, original.sources, `${code}: original primary sources and actual access dates`);
    assert.equal(post.authorType, 'Organization');
    assert.equal(post.cropTopics.join(','), 'tomato');
    assert.equal(post.weatherRelevant, false, 'a worked transport example is not a weather advisory');
    const normalized = [...post.content].map(character => {
      const point = character.codePointAt(0);
      const zero = zeroes.find(start => point >= start && point <= start + 9);
      return zero === undefined ? character : String(point - zero);
    }).join('').replaceAll(',', '').replaceAll('٬', '').replaceAll('٫', '.');
    const numbers = new Set(normalized.match(/\d+(?:\.\d+)?/g));
    for (const value of ['1000', '980', '950', '13720', '16150', '1500', '3300', '12220', '12850', '630', '12.22', '12.85', '11900', '320', '16.34']) {
      assert.ok(numbers.has(value), `${code}: preserves worked-example value ${value}`);
    }
    assert.equal(post.coverImage, '/editorial/tomato-market-comparison-neutral.webp');
    assert.ok(post.coverAlt && post.coverCaption && post.editorialNote);
    assert.ok(post.content.includes('/crop/tomato') && post.content.includes('/delivery-calculator'));
    assert.ok((post.content.match(/^## /gm) || []).length >= 6, `${code}: complete guide sections`);
  }
});

test('native library URLs contain the correct language before JavaScript loads', { skip: existsSync(new URL('../dist/ur/blog.html', import.meta.url)) ? false : 'Build native library pages first.' }, () => {
  const sitemap = readFileSync(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  for (const code of EDITORIAL_LANGUAGE_CODES) {
    const route = code === 'hi' ? '/blog' : `/${code}/blog`;
    const html = readFileSync(new URL(`../dist${route}.html`, import.meta.url), 'utf8');
    assert.match(html, new RegExp(`<html[^>]*\\blang="${code}"`), code);
    assert.ok(html.includes(`href="https://sahibhav.in${route}"`), `${code}: native self-canonical`);
    assert.ok(html.includes(translations.find(post => post.language === code).title.replaceAll('&', '&amp;')), `${code}: native article title in initial HTML`);
    assert.ok(sitemap.includes(`<loc>https://sahibhav.in${route}</loc>`));
    assert.doesNotMatch(html.split('</head>')[0], /noindex/);
  }
  const urdu = readFileSync(new URL('../dist/blog/tomato-market-delivery-ur.html', import.meta.url), 'utf8');
  assert.match(urdu, /dir="rtl"/);
  assert.match(urdu, /<code dir="ltr"[^>]*>950 × 16 − 3,300 = ₹11,900<\/code>/, 'Urdu worked arithmetic preserves left-to-right operator order');
});
