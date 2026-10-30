import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { EDITORIAL_LANGUAGE_CODES } from '../shared/editorialLanguages.js';
import { getEditorialPost, listEditorialPosts } from '../server/utils/editorial.js';
import { editorialCropName } from '../src/utils/editorialLabels.js';

const posts = JSON.parse(readFileSync(new URL('../server/db/data/blog-posts.json', import.meta.url), 'utf8'));
const groups = ['mustard-sowing-preparation-2026', 'chickpea-sowing-preparation-2026', 'maize-drying-storage-2026', 'farm-weather-oct31-2026'];
const headingCount = text => (text.match(/^## /gm) || []).length;
const tableCount = text => (text.match(/^\|[^\n]*---/gm) || []).length;
const factualNumbers = {
  'mustard-sowing-preparation-2026': ['172', '2025', '11', '2024', '150', '35', '2020'],
  'chickpea-sowing-preparation-2026': ['16', '3', '4', '30', '2026'],
  'maize-drying-storage-2026': ['22', '25', '12', '1000', '18', '932', '68'],
  'farm-weather-oct31-2026': ['2026', '30', '31', '1', '2', '3', '24', '45'],
};

test('four seasonal guides have complete, scoped translations in all 14 editorial languages', () => {
  for (const group of groups) {
    const variants = posts.filter(post => post.translationGroup === group && post.status === 'published');
    assert.deepEqual(variants.map(post => post.language).sort(), [...EDITORIAL_LANGUAGE_CODES].sort(), group);
    const source = variants.find(post => post.language === 'hi');
    for (const post of variants) {
      assert.deepEqual(post.sources.map(({ url, accessedAt }) => ({ url, accessedAt })), source.sources.map(({ url, accessedAt }) => ({ url, accessedAt })), `${post.slug}: original primary evidence`);
      for (const field of ['cropTopics', 'commodityIds', 'stateIds', 'weatherRelevant', 'coverImage']) assert.deepEqual(post[field], source[field], `${post.slug}: ${field}`);
      assert.deepEqual(post.priceLinks.map(link => link.path), source.priceLinks.map(link => link.path), `${post.slug}: exact commodity price paths`);
      assert.equal(headingCount(post.content), headingCount(source.content), `${post.slug}: complete guide structure`);
      assert.equal(tableCount(post.content), tableCount(source.content), `${post.slug}: decision tables retained`);
      assert.ok(post.content.length >= source.content.length * 0.55, `${post.slug}: substantive article, not an empty localized shell`);
      const numbers = new Set(post.content.replaceAll(',', '').match(/\d+(?:\.\d+)?/g));
      for (const value of factualNumbers[group]) assert.ok(numbers.has(value), `${post.slug}: preserves factual value ${value}`);
      assert.deepEqual(getEditorialPost(posts, post.slug).translations.map(item => item.language).sort(), [...EDITORIAL_LANGUAGE_CODES].sort(), `${post.slug}: actual reciprocal equivalents`);
      if (post.language !== 'hi') assert.notEqual(post.content, source.content, `${post.slug}: native article body`);
    }
  }
});

test('translated storage and sowing advice keeps exact product applicability', () => {
  for (const language of EDITORIAL_LANGUAGE_CODES) {
    const groupFor = crop => listEditorialPosts(posts, { language, crop, limit: 100 }).posts.map(post => posts.find(item => item.slug === post.slug)?.translationGroup);
    assert.ok(groupFor('maize').includes('maize-drying-storage-2026'), language);
    for (const crop of ['baby-corn', 'sweet-corn']) assert.ok(!groupFor(crop).includes('maize-drying-storage-2026'), `${language}: ${crop}`);
    assert.ok(groupFor('mustard').includes('mustard-sowing-preparation-2026'), language);
    assert.ok(!groupFor('mustard-oil').includes('mustard-sowing-preparation-2026'), language);
    for (const crop of ['gram', 'bengal-gramgramwhole', 'kabuli-chanachickpeas-white']) assert.ok(groupFor(crop).includes('chickpea-sowing-preparation-2026'), `${language}: ${crop}`);
    for (const crop of ['gram-rawchholia', 'bengal-gram-dalchana-dal']) assert.ok(!groupFor(crop).includes('chickpea-sowing-preparation-2026'), `${language}: ${crop}`);
  }
});

test('editorial whole-crop topic labels use native names without aliasing price identities', () => {
  assert.equal(editorialCropName('gram', 'चना', 'ta'), 'கொண்டைக்கடலை');
  assert.equal(editorialCropName('gram', 'चना', 'pa'), 'ਚਣੇ');
  assert.equal(editorialCropName('gram', 'चना', 'bn'), 'ছোলা');
  assert.equal(editorialCropName('paddy', 'धान', 'kn'), 'ಭತ್ತ');
  assert.equal(editorialCropName('paddy', 'धान', 'gu'), 'ડાંગર');
  assert.equal(editorialCropName('paddy', 'धान', 'mr'), 'भात (धान)');
  assert.equal(editorialCropName('unknown-source-item', 'Original label', 'ta'), 'Original label');
  assert.equal(editorialCropName('__proto__', 'Unknown', 'ta'), 'Unknown');
});

test('translated article HTML renders tables and real language alternates before JavaScript', { skip: !existsSync(new URL('../dist/blog/chana-buvai-nami-beej-taiyari-ta.html', import.meta.url)) ? 'Build translated article pages first.' : false }, () => {
  for (const post of posts.filter(post => groups.includes(post.translationGroup))) {
    const html = readFileSync(new URL(`../dist/blog/${post.slug}.html`, import.meta.url), 'utf8');
    assert.match(html, new RegExp(`<html[^>]*\\blang="${post.language}"`), post.slug);
    assert.equal((html.match(/<table\b/g) || []).length, tableCount(post.content), `${post.slug}: semantic decision table`);
    const head = html.split('</head>')[0];
    for (const equivalent of getEditorialPost(posts, post.slug).translations) assert.ok(head.includes(`href="https://sahibhav.in/blog/${equivalent.slug}"`), `${post.slug}: alternate ${equivalent.language}`);
    assert.ok(!head.includes('noindex'), `${post.slug}: published guide remains indexable`);
    if (post.language === 'ur') assert.match(html, /dir="rtl"/, post.slug);
  }
  const urduMaize = readFileSync(new URL('../dist/blog/makka-sukhana-bhandaran-bechne-se-pehle-ur.html', import.meta.url), 'utf8');
  assert.match(urduMaize, /<code dir="ltr"[^>]*>[^<]*1000[^<]*932[^<]*<\/code>/, 'Urdu drying equation keeps left-to-right arithmetic');
});
