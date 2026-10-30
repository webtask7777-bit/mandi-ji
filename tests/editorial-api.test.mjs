import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { createCmsRouter } from '../server/routes/cms.js';
import { getEditorialPost, listEditorialPosts, prepareEditorialPost, validateEditorialPost } from '../server/utils/editorial.js';

const now = Date.parse('2026-10-16T18:00:00.000Z');
const post = (id, extra = {}) => ({
  id, slug: `guide-${id}`, title: `फसल गाइड ${id}`, content: `खेती की उपयोगी और अलग जानकारी ${id}`,
  excerpt: 'फसल की तैयारी और बिक्री की जानकारी', seoTitle: `फसल की जानकारी ${id}`,
  seoDescription: 'अपने खेत, क्षेत्र और मंडी के हिसाब से निर्णय की तैयारी करें।',
  status: 'published', category: 'फसल की तैयारी', cropTopics: ['wheat'], stateIds: [],
  language: 'hi', translationGroup: null, tags: ['बुवाई'], sources: [{
    title: 'कृषि अनुसंधान परिषद', url: 'https://icar.gov.in/', accessedAt: '2026-10-16',
  }], coverImage: '/editorial/gehun-buvai.webp', coverAlt: 'गेहूँ की बुवाई की तैयारी का सांकेतिक दृश्य',
  regionLabel: 'भारत · स्थानीय सलाह से मिलाएँ', priceLinks: [{ label: 'गेहूँ के दर्ज भाव', path: '/crop/wheat' }],
  author: 'सही भाव संपादकीय', authorType: 'Organization', relatedSlugs: [],
  createdAt: '2026-09-01T00:00:00.000Z', publishedAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-02T00:00:00.000Z',
  ...extra,
});

test('CMS filters the entire collection before pagination and resolves curated commodity aliases', async t => {
  const fixtures = Array.from({ length: 65 }, (_, index) => post(`wheat-${index}`, { publishedAt: '2026-10-01T00:00:00.000Z' }));
  fixtures.push(
    post('paddy-general', { cropTopics: ['paddy'], category: 'कटाई', relatedSlugs: ['guide-paddy-cg'] }),
    post('paddy-cg', { cropTopics: ['paddy'], stateIds: ['chhattisgarh'], category: 'कटाई' }),
    post('paddy-punjab', { cropTopics: ['paddy'], stateIds: ['punjab'] }),
    post('paddy-marathi', { cropTopics: ['paddy'], language: 'mr', stateIds: ['maharashtra'] }),
    post('draft', { status: 'draft', cropTopics: ['paddy'] }),
  );
  const server = express().use('/cms', createCmsRouter(name => name === 'blog-posts.json' ? fixtures : [])).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/cms/blog`;
  const get = async query => {
    const response = await fetch(`${base}${query}`);
    assert.equal(response.status, 200);
    return response.json();
  };
  const result = await get('?crop=paddycommon&state=chhattisgarh&limit=1');
  assert.equal(result.total, 2);
  assert.equal(result.totalPages, 2);
  assert.equal(result.posts.length, 1);
  assert.ok(result.posts.every(item => !Object.hasOwn(item, 'content')));
  assert.equal(result.facets.crops.find(item => item.id === 'wheat').count, 65, 'facets are not limited to page or selected crop');
  assert.equal(result.facets.crops.find(item => item.id === 'paddy').count, 2);
  const second = await get('?crop=paddycommon&state=chhattisgarh&limit=1&page=2');
  assert.notEqual(second.posts[0].slug, result.posts[0].slug);
  assert.equal((await get('?crop=paddy')).total, 3);
  assert.equal((await get('?crop=paddy&state=all')).total, 3, 'national crop pages include all regional guides');
  assert.equal((await get('?crop=padd')).total, 0, 'no substring relevance guesses');
  assert.equal((await get('?language=mr')).posts[0].id, 'paddy-marathi');
  assert.equal((await get('?language=unsupported')).total, 0);
  assert.equal((await get('?category=%E0%A4%95%E0%A4%9F%E0%A4%BE%E0%A4%88')).total, 2);
  const target = await get('?slugs=guide-paddy-cg');
  assert.equal(target.total, 1, 'slug lookup finds entries beyond first 50');
  const detail = await get('/guide-paddy-general');
  assert.equal(detail.relatedPosts[0].id, 'paddy-cg');
  assert.equal((await fetch(`${base}/guide-draft`)).status, 404);
});

test('pagination cannot return unbounded or negative slices; search and slug filters compose', () => {
  const fixtures = Array.from({ length: 70 }, (_, id) => post(`item-${id}`));
  const result = listEditorialPosts(fixtures, { page: '-2', limit: '999999' });
  assert.equal(result.page, 1);
  assert.equal(result.posts.length, 50);
  assert.equal(result.totalPages, 2);
  assert.equal(listEditorialPosts(fixtures, { page: '2abc', limit: '0' }).posts.length, 10);
  assert.equal(listEditorialPosts(fixtures, { q: 'बुवाई', slugs: 'guide-item-69' }).posts[0].id, 'item-69');
  const slugs = fixtures.slice(0, 30).map(item => item.slug).join(',');
  assert.equal(listEditorialPosts(fixtures, { slugs, limit: '50' }).total, 20);
  assert.equal(listEditorialPosts(fixtures, { page: '10000000' }).page, 1000000);
});

test('exact commodity applicability narrows topics without mixing grain maize, baby corn or chickpea forms', () => {
  const fixtures = [
    post('maize-grain', { cropTopics: ['maize'], commodityIds: ['maize'], stateIds: ['punjab'] }),
    post('maize-general', { cropTopics: ['maize'] }),
    post('desi-chickpea', { cropTopics: ['gram'], commodityIds: ['bengal-gramgramwhole'] }),
    post('wrong-topic', { cropTopics: ['wheat'], commodityIds: ['maize'] }),
    post('processed', { cropTopics: ['paddy'], commodityIds: ['rice'] }),
  ];
  const ids = query => listEditorialPosts(fixtures, query).posts.map(item => item.id);
  assert.deepEqual(ids({ crop: 'maize' }), ['maize-general', 'maize-grain']);
  assert.deepEqual(ids({ crop: ' MAIZE ' }), ids({ crop: 'maize' }));
  for (const crop of ['baby-corn', 'sweet-corn']) assert.deepEqual(ids({ crop }), ['maize-general'], crop);
  assert.deepEqual(ids({ crop: 'bengal-gramgramwhole' }), ['desi-chickpea']);
  for (const crop of ['kabuli-chanachickpeas-white', 'gram-rawchholia', 'bengal-gram-dalchana-dal', 'gram', 'rice', 'maiz', '__proto__', 'constructor', 'toString']) {
    assert.deepEqual(ids({ crop }), [], crop);
  }
  assert.deepEqual(ids({ crop: 'maize', state: 'haryana' }), ['maize-general']);
  assert.deepEqual(ids({ crop: 'maize', language: 'mr' }), []);
  assert.deepEqual(ids({ crop: 'maize', slugs: 'guide-wrong-topic' }), [], 'allowlist never overrides topic mismatch');
  const page = listEditorialPosts(fixtures, { crop: 'maize', limit: 1, page: 2 });
  assert.equal(page.total, 2);
  assert.equal(page.posts[0].id, 'maize-grain');
  for (const commodityIds of [[], null, 'maize', {}]) {
    assert.equal(listEditorialPosts([post('invalid', { cropTopics: ['maize'], commodityIds })], { crop: 'maize' }).total, 0, JSON.stringify(commodityIds));
  }
});

test('commodity applicability validates canonical exact IDs, topic membership and editable metadata', () => {
  const existing = post('maize', { cropTopics: ['maize'] });
  const edited = prepareEditorialPost({ commodityIds: ['maize'] }, { existing, posts: [existing], now });
  assert.deepEqual(edited.errors, []);
  assert.deepEqual(edited.post.commodityIds, ['maize']);
  assert.equal(edited.changed, true);
  assert.equal(edited.post.updatedAt, new Date(now).toISOString());
  const preserved = prepareEditorialPost({ title: edited.post.title }, { existing: edited.post, posts: [edited.post], now });
  assert.deepEqual(preserved.errors, []);
  assert.deepEqual(preserved.post.commodityIds, ['maize']);
  assert.equal(preserved.changed, false);
  assert.deepEqual(validateEditorialPost(post('desi', { cropTopics: ['gram'], commodityIds: ['bengal-gramgramwhole'] }), [], { now }), []);
  for (const commodityIds of [[], null, 'maize', {}, ['not-a-crop'], ['maiz'], ['__proto__'], ['constructor'], ['toString'], [' MAIZE '], ['maize', 'maize'], ['wheat']]) {
    const result = prepareEditorialPost({ commodityIds }, { existing, posts: [existing], now });
    assert.ok(result.errors.some(error => error.includes('commodityIds')), JSON.stringify(commodityIds));
  }
  assert.ok(prepareEditorialPost({ title: 'अधूरा लेख', cropTopics: ['maize'], commodityIds: ['unknown'] }, { now, id: 'draft' }).errors.some(error => error.includes('commodityIds')), 'draft scopes are validated too');
});

test('translation and related links include only complete published records and matching related language', () => {
  const first = post('hi', { translationGroup: 'wheat-sowing', relatedSlugs: ['guide-mr', 'guide-second', 'guide-draft', 'guide-second'] });
  const fixtures = [first, post('mr', { language: 'mr', translationGroup: 'wheat-sowing' }), post('second'), post('draft', { status: 'draft', language: 'gu', translationGroup: 'wheat-sowing' })];
  const result = getEditorialPost(fixtures, first.slug);
  assert.deepEqual(result.relatedPosts.map(item => item.id), ['second']);
  assert.deepEqual(result.translations.map(item => item.language), ['hi', 'mr']);
  assert.ok(result.relatedPosts.every(item => !Object.hasOwn(item, 'content')));
});

test('publication requires sources, real dates, cover metadata and valid crop/state/language IDs', () => {
  assert.deepEqual(validateEditorialPost(post('valid'), [], { now }), []);
  assert.deepEqual(validateEditorialPost(post('ut', { stateIds: ['ladakh', 'dadra-daman'] }), [], { now }), []);
  const invalidCases = [
    { sources: [] }, { sources: [{ title: 'गलत', url: 'http://example.com', accessedAt: '2026-10-16' }] },
    { sources: [{ title: 'गलत', url: 'https://icar.gov.in', accessedAt: '2026-02-31' }] },
    { sources: [{ title: 'गलत', url: 'https://icar.gov.in', accessedAt: '2026-10-17' }] },
    { coverImage: '//remote.example/photo.webp' }, { coverImage: '/../image.webp' }, { coverAlt: '' },
    { seoTitle: '' }, { excerpt: '' }, { content: '' }, { regionLabel: '' }, { cropTopics: ['not-a-crop'] },
    { stateIds: ['not-a-state'] }, { language: 'unknown' }, { updatedAt: '2027-01-01T00:00:00.000Z' },
    { updatedAt: '2026-08-01T00:00:00.000Z' }, { authorType: 'Person' },
    { priceLinks: [{ label: 'अमान्य', path: 'javascript:alert(1)' }] },
    { priceLinks: [{ label: 'अमान्य', path: '/crop/not-a-crop' }] },
    { priceLinks: [{ label: 'अमान्य', path: '/mandi-bhav/fake-state' }] },
  ];
  for (const invalid of invalidCases) assert.ok(validateEditorialPost(post('invalid', invalid), [], { now }).length, JSON.stringify(invalid));
});

test('drafts can be incomplete, but metadata and duplicate slugs are still checked', () => {
  const draft = prepareEditorialPost({ title: 'धान की तैयारी' }, { now, id: 'new' });
  assert.deepEqual(draft.errors, []);
  assert.equal(draft.post.status, 'draft');
  assert.equal(draft.post.slug, 'धान-की-तैयारी');
  assert.equal(draft.post.publishedAt, null);
  const duplicate = prepareEditorialPost({ title: 'दूसरा लेख', slug: 'guide-existing' }, { posts: [post('existing')], now, id: 'new' });
  assert.ok(duplicate.errors.some(message => message.includes('slug')));
});

test('renamed duplicate bodies and duplicate language variants cannot be published', () => {
  const original = post('original', { translationGroup: 'wheat-sowing' });
  assert.ok(validateEditorialPost(post('copy', { content: `  ${original.content.replace(/ /g, '\n\n')} ` }), [original], { now }).some(message => message.includes('duplicate')));
  assert.ok(validateEditorialPost(post('variant', { translationGroup: 'wheat-sowing' }), [original], { now }).some(message => message.includes('translation group')));
  assert.deepEqual(validateEditorialPost(post('translation', { translationGroup: 'wheat-sowing', language: 'mr' }), [original], { now }), []);
});

test('server preserves first publication and identity, changes updatedAt only on actual content edits', () => {
  const existing = post('original');
  const unchanged = prepareEditorialPost({ title: existing.title, content: existing.content }, { existing, posts: [existing], now });
  assert.deepEqual(unchanged.errors, []);
  assert.equal(unchanged.changed, false);
  assert.equal(unchanged.post.updatedAt, existing.updatedAt);
  const edited = prepareEditorialPost({ content: `${existing.content}\nनई जानकारी`, id: 'forged', publishedAt: '2026-01-01T00:00:00.000Z' }, { existing, posts: [existing], now });
  assert.deepEqual(edited.errors, []);
  assert.equal(edited.post.publishedAt, existing.publishedAt);
  assert.equal(edited.post.createdAt, existing.createdAt);
  assert.equal(edited.post.id, existing.id);
  assert.equal(edited.post.updatedAt, new Date(now).toISOString());
  assert.deepEqual(edited.post.priceLinks, existing.priceLinks, 'omitted links are preserved during edits');
  assert.ok(prepareEditorialPost({ author: 'डॉ. अप्रमाणित विशेषज्ञ' }, { existing, posts: [existing], now }).errors.length);
  assert.ok(prepareEditorialPost({ updatedAt: '2027-01-01T00:00:00.000Z' }, { existing, posts: [existing], now }).errors.length);
  const draft = post('draft', { status: 'draft', publishedAt: null });
  const firstPublish = prepareEditorialPost({ status: 'published' }, { existing: draft, posts: [draft], now });
  assert.deepEqual(firstPublish.errors, []);
  assert.equal(firstPublish.post.publishedAt, new Date(now).toISOString());
  const republished = prepareEditorialPost({ status: 'published' }, { existing: { ...existing, status: 'draft' }, posts: [existing], now });
  assert.equal(republished.post.publishedAt, existing.publishedAt);
});
