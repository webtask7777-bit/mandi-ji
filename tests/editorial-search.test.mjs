import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listEditorialPosts, normalizeSearch, searchScore } from '../server/utils/editorial.js';

const posts = JSON.parse(readFileSync(new URL('../server/db/data/blog-posts.json', import.meta.url), 'utf8'));
const slugs = query => listEditorialPosts(posts, query).posts.map(post => post.slug);

test('article bodies are searchable (audit: फफूँद returned nothing)', () => {
  assert.ok(slugs({ q: 'फफूँद' }).includes('bheega-dhan-sukhana-nami-bhandaran'));
  assert.ok(slugs({ q: 'अंकुरण' }).includes('bheega-dhan-sukhana-nami-bhandaran'));
  assert.ok(slugs({ q: 'पत्तियों' }).length >= 1);
});

test('Hindi spelling variants and reviewed aliases find each other, nothing fuzzy', () => {
  assert.equal(normalizeSearch('फफूँद'), normalizeSearch('फफूंद'));
  assert.equal(normalizeSearch('\u095c'), normalizeSearch('\u0921\u093c'), 'precomposed and combining nukta (ड़)');
  assert.deepEqual(slugs({ q: 'fungus' }), slugs({ q: 'फफूंद' }));
  const result = listEditorialPosts(posts, { q: 'कोईऐसाशब्दनहीं' });
  assert.equal(result.total, 0, 'an unrelated word finds nothing');
  assert.ok(result.suggestions.length > 0, 'and offers guides as suggestions, not as matches');
});

test('title matches rank above body-only matches; every word must match', () => {
  const post = { title: 'धान सुखाना', excerpt: '', tags: [], content: 'नमी की जाँच' };
  assert.ok(searchScore(post, 'धान') > searchScore(post, 'नमी'));
  assert.equal(searchScore(post, 'धान टमाटर'), 0);
});

test('search keeps publication and language rules', () => {
  const draft = { ...posts[0], slug: 'draft-only', status: 'draft', title: 'अनोखाशब्द', language: 'hi' };
  assert.deepEqual(listEditorialPosts([...posts, draft], { q: 'अनोखाशब्द' }).posts, []);
  const marathi = listEditorialPosts(posts, { q: 'टोमॅटो', language: 'mr' }).posts;
  assert.ok(marathi.every(post => post.language === 'mr'));
});
