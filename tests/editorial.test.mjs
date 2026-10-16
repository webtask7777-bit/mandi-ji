import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import cms from '../server/routes/cms.js';

const root = process.cwd();
const posts = JSON.parse(readFileSync(path.join(root, 'server/db/data/blog-posts.json'), 'utf8'));
const articles = posts.filter(post => post.coverImage?.startsWith('/editorial/'));

test('editorial set preserves the wheat URL and has complete assets, references and working article links', () => {
  assert.equal(articles.length, 8);
  assert.equal(new Set(articles.map(post => post.slug)).size, articles.length);
  assert.equal(new Set(articles.map(post => post.coverImage)).size, articles.length);
  const wheat = articles.find(post => post.slug === 'gehun-ki-buvai-sahi-samay-aur-tarika');
  assert.equal(wheat.id, 'a0e40664-c8d4-4723-8fb6-02f65913fa2a');
  assert.equal(wheat.publishedAt, '2026-03-13T02:00:41.549Z');
  for (const post of articles) {
    const bytes = readFileSync(path.join(root, 'public', post.coverImage));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
    assert.ok(post.coverAlt && post.coverCaption.includes('सांकेतिक'));
    assert.ok(post.sources.length >= 2 && post.takeaways.length >= 3);
    for (const source of post.sources) assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(Date.parse(post.updatedAt) >= Date.parse(post.publishedAt));
    for (const slug of post.relatedSlugs) assert.ok(posts.some(item => item.slug === slug && item.status === 'published'), slug);
    for (const match of post.content.matchAll(/\]\(\/blog\/([^\s)#]+)(?:#[^)]*)?\)/g)) {
      assert.ok(posts.some(item => item.slug === match[1]), `broken in-article link ${match[1]}`);
    }
  }
});

test('CMS cards omit article bodies while article endpoints retain complete source-based guides', async () => {
  const app = express().use('/cms', cms);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}/cms/blog`;
    const listing = await (await fetch(base)).json();
    assert.ok(listing.posts.length >= 8);
    assert.ok(listing.posts.every(post => !Object.hasOwn(post, 'content')));
    assert.ok(listing.posts.every(post => post.title && post.coverImage && post.slug));
    const detail = await (await fetch(`${base}/${articles[0].slug}`)).json();
    assert.equal(detail.content, articles[0].content);
    assert.deepEqual(detail.sources, articles[0].sources);
    assert.equal((await fetch(`${base}/unknown-editorial-test`)).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

const built = articles.every(post => existsSync(path.join(root, 'dist/blog', `${post.slug}.html`)));
test('published article HTML exposes its own social thumbnail, source links and updated structured data', { skip: built ? false : 'Run npm run build to generate the editorial pages.' }, () => {
  for (const post of articles) {
    const html = readFileSync(path.join(root, 'dist/blog', `${post.slug}.html`), 'utf8');
    const head = html.split('</head>')[0];
    assert.equal((html.match(/<h1\b/g) || []).length, 1, post.slug);
    assert.equal((head.match(/<title\b/g) || []).length, 1, post.slug);
    assert.ok(head.includes(`content="https://mandi-ji.vercel.app${post.coverImage}"`), `${post.slug}: social cover`);
    assert.ok(html.includes(`src="${post.coverImage}"`), `${post.slug}: visible cover`);
    assert.ok(html.includes('स्रोत'), `${post.slug}: visible sourcing`);
    const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    const posting = schemas.flatMap(item => item['@graph'] || [item]).find(item => item['@type'] === 'BlogPosting');
    assert.ok(posting, `${post.slug}: BlogPosting`);
    assert.equal(posting.author['@type'], 'Organization');
    assert.equal(posting.dateModified, post.updatedAt);
    assert.ok(JSON.stringify(posting.image).includes(post.coverImage));
  }
});
