import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listEditorialPosts } from '../server/utils/editorial.js';

const posts = JSON.parse(readFileSync(new URL('../server/db/data/blog-posts.json', import.meta.url), 'utf8'));
const wetPaddy = 'bheega-dhan-sukhana-nami-bhandaran';
const frost = 'pala-sabji-fasal-taiyari';
const tomato = 'tamatar-mandi-dhulai-ke-baad-bachat';
const slugs = query => listEditorialPosts(posts, query).posts.map(post => post.slug);

test('body-only problems can be found with Hindi spelling variants and English terms', () => {
  for (const q of ['फफूँद', 'फफूंद', '  MOULD  ', 'mold', 'धान में फफूंद', 'paddy germination', 'अंकुरण']) {
    assert.ok(slugs({ q }).includes(wetPaddy), `${q}: wet-paddy guide`);
  }
  for (const q of ['पत्तियों', 'पत्तियाँ', 'पत्तियां', 'leaves', 'frost leaves']) {
    assert.ok(slugs({ q }).includes(frost), `${q}: frost preparation guide`);
  }
  assert.deepEqual(slugs({ q: '  गेहूँ—बुवाई  ' }), slugs({ q: 'गेहूं बुआई' }));
  assert.deepEqual(slugs({ q: 'फफू\u200dंद' }), slugs({ q: 'फफूंद' }));
});

test('focused title and summary matches precede incidental body mentions', () => {
  assert.equal(slugs({ q: 'tomato delivery' })[0], tomato);
  assert.equal(slugs({ q: 'wheat sowing' })[0], 'gehun-ki-buvai-sahi-samay-aur-tarika');
  assert.ok(slugs({ q: 'bheega dhan' }).includes(wetPaddy));
  assert.equal(slugs({ q: 'gehun buwai' })[0], 'gehun-ki-buvai-sahi-samay-aur-tarika');
  assert.ok(slugs({ q: 'tamatar bhada' }).includes(tomato));
});

test('search retains crop, state, language and category restrictions before pagination', () => {
  const result = listEditorialPosts(posts, { q: 'rain', crop: 'paddy', language: 'hi', state: 'punjab', limit: '1' });
  const full = listEditorialPosts(posts, { q: 'rain', crop: 'paddy', language: 'hi', state: 'punjab', limit: '50' });
  assert.ok(full.total > 1);
  assert.equal(result.total, full.total);
  assert.equal(result.totalPages, full.total);
  assert.equal(result.posts[0].slug, full.posts[0].slug);
  assert.equal(listEditorialPosts(posts, { q: 'rain', crop: 'paddy', state: 'punjab', limit: '1', page: '2' }).posts[0].slug, full.posts[1].slug);
  assert.ok(full.posts.every(post => post.cropTopics.includes('paddy') && post.language === 'hi' && (!post.stateIds.length || post.stateIds.includes('punjab'))));
  assert.ok(full.posts.every(post => !Object.hasOwn(post, 'content')), 'Search still returns lightweight cards');
  assert.deepEqual(slugs({ q: 'mould', crop: 'tomato' }), []);
  assert.deepEqual(slugs({ q: 'mould', category: 'मंडी और लागत' }), []);
  assert.deepEqual(slugs({ q: 'mould', language: 'mr' }), []);
  assert.deepEqual(slugs({ q: 'tomato delivery', language: 'en' }), ['tomato-market-delivery-en']);
});

test('unsupported symptoms and unrelated products remain empty rather than relaxing the query', () => {
  for (const q of ['मिर्च पत्तियों', 'कीट रोग', 'tomato mould', 'paddy aphids']) {
    const result = listEditorialPosts(posts, { q });
    assert.equal(result.total, 0, q);
    assert.deepEqual(result.posts, [], q);
  }
  assert.deepEqual(slugs({ q: 'फफूंद', slugs: tomato }), []);
});

test('search uses visible words, keeps product forms distinct and excludes URL fragments', () => {
  const fixtures = [
    { slug: 'paddy', title: 'धान की तैयारी', content: 'धान रखें। [आधिकारिक स्रोत](https://example.test/aphids-rice)', status: 'published', language: 'hi', cropTopics: ['paddy'], publishedAt: '2026-01-01T00:00:00Z' },
    { slug: 'rice', title: 'Rice storage', content: 'A rice price example.', status: 'published', language: 'hi', cropTopics: ['paddy'], publishedAt: '2026-01-02T00:00:00Z' },
    { slug: 'draft', title: 'धान फफूंद', content: 'Unpublished content.', status: 'draft', language: 'hi', cropTopics: ['paddy'] },
  ];
  const find = q => listEditorialPosts(fixtures, { q }).posts.map(post => post.slug);
  assert.deepEqual(find('paddy'), ['paddy']);
  assert.deepEqual(find('rice'), ['rice']);
  assert.deepEqual(find('aphids'), []);
  assert.deepEqual(find('फफूंद'), []);
  assert.deepEqual(find('  '), ['rice', 'paddy']);
});

test('processed-product filters do not inherit cultivation and raw-crop handling guides', () => {
  for (const crop of ['rice', 'basmati-rice', 'broken-rice', 'beaten-rice', 'wheat-atta', ' RICE ']) {
    assert.equal(listEditorialPosts(posts, { crop }).total, 0, crop);
    assert.equal(listEditorialPosts(posts, { crop, q: 'बुवाई' }).total, 0, crop);
  }
  assert.ok(slugs({ crop: 'paddycommon' }).includes(wetPaddy));
  assert.ok(slugs({ crop: 'paddybasmati' }).includes(wetPaddy));
  assert.ok(slugs({ crop: 'wheat' }).includes('gehun-ki-buvai-sahi-samay-aur-tarika'));
});

test('advice discovery can use every published Hindi guide and search newer selling topics', () => {
  const all = listEditorialPosts(posts, { language: 'hi', limit: '12', page: '1' });
  assert.equal(all.total, posts.filter(post => post.language === 'hi' && post.status === 'published').length);
  const publishedSlugs = new Set(Array.from({ length: all.totalPages }, (_, page) =>
    listEditorialPosts(posts, { language: 'hi', limit: '12', page: String(page + 1) }).posts).flat().map(post => post.slug));
  for (const slug of ['mandi-bhav-min-max-modal-kaise-padhen', 'enam-kisan-registration-bikri-bhugtan', 'mandi-taul-katauti-bhugtan-checklist']) {
    assert.ok(publishedSlugs.has(slug), slug);
  }
  assert.ok(slugs({ language: 'hi', q: 'फफूंद' }).includes(wetPaddy));
  assert.ok(slugs({ language: 'hi', q: 'eNAM', category: 'मंडी और लागत' }).includes('enam-kisan-registration-bikri-bhugtan'));
  assert.equal(slugs({ language: 'hi', q: 'तौल', category: 'मंडी और लागत' })[0], 'mandi-taul-katauti-bhugtan-checklist');
});
