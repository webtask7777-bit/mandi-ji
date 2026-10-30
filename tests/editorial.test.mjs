import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import cms from '../server/routes/cms.js';
import { listEditorialPosts } from '../server/utils/editorial.js';
import { blogRedirectPath } from '../shared/blogPagination.js';

const root = process.cwd();
const posts = JSON.parse(readFileSync(path.join(root, 'server/db/data/blog-posts.json'), 'utf8'));
const articles = posts.filter(post => post.coverImage?.startsWith('/editorial/'));
const imageManifest = JSON.parse(readFileSync(path.join(root, 'src/data/editorialImages.json'), 'utf8'));
const linksToArticle = (html, slug) => [...html.matchAll(/href="([^"]+)"/g)].some(([, href]) => {
  try { return new URL(href.replaceAll('&amp;', '&'), 'https://sahibhav.in').pathname === `/blog/${slug}`; } catch { return false; }
});

test('editorial covers are responsive and shared translation artwork is explicitly text-free', () => {
  for (const post of articles) {
    const image = imageManifest[post.coverImage];
    assert.ok(image, `${post.slug}: registered cover`);
    assert.ok(Number.isInteger(image.width) && image.width >= 1200, `${post.slug}: full-size share cover`);
    assert.ok(Number.isInteger(image.height) && image.height > 0, `${post.slug}: positive cover height`);
    assert.deepEqual(image.candidates.map(item => item.width), [640, 960, image.width], `${post.slug}: responsive widths include the original`);
    assert.deepEqual(image.candidates.at(-1), { src: post.coverImage, width: image.width, height: image.height }, `${post.slug}: original dimensions match the manifest`);
    for (const candidate of image.candidates) {
      assert.ok(Math.abs(candidate.height - candidate.width * image.height / image.width) <= 1, `${post.slug}: responsive aspect ratio is preserved`);
      const file = path.join(root, 'public', candidate.src);
      assert.ok(existsSync(file), `${post.slug}: responsive asset ${candidate.src}`);
      assert.ok(readFileSync(file).length > 100, `${post.slug}: nonempty responsive asset`);
    }
  }
  const tomato = articles.filter(post => post.translationGroup === 'tomato-sale-delivery');
  const coverCounts = new Map();
  for (const post of tomato) coverCounts.set(post.coverImage, (coverCounts.get(post.coverImage) || 0) + 1);
  for (const [cover, count] of coverCounts) {
    if (count > 1) assert.equal(imageManifest[cover].textFree, true, 'Shared art must have no language-specific image text');
  }
});

test('editorial set preserves the wheat URL and has complete assets, references and working article links', () => {
  assert.ok(articles.length >= 8, 'Preserves the original guide collection while allowing new reviewed source-based entries');
  assert.equal(new Set(articles.map(post => post.slug)).size, articles.length);
  const wheat = articles.find(post => post.slug === 'gehun-ki-buvai-sahi-samay-aur-tarika');
  assert.equal(wheat.id, 'a0e40664-c8d4-4723-8fb6-02f65913fa2a');
  assert.equal(wheat.publishedAt, '2026-03-13T02:00:41.549Z');
  for (const post of articles) {
    const bytes = readFileSync(path.join(root, 'public', post.coverImage));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
    assert.ok(post.coverAlt && post.coverCaption && post.regionLabel);
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
test('guide language aliases stay indexable while actual content filters remain noindex', { skip: existsSync(path.join(root, 'dist-ssr/entry-server.js')) ? false : 'Build the SSR bundle first.' }, async () => {
  const { renderPage } = await import('../dist-ssr/entry-server.js');
  for (const [route, expected, excluded, indexable = false, canonicalPath] of [
    ['/blog?crop=tomato', 'tamatar-mandi-dhulai-ke-baad-bachat', 'gehun-ki-buvai-sahi-samay-aur-tarika', false, '/blog?crop=tomato'],
    ['/blog?language=mr', 'tamatar-vikri-vahatuk-kharch-marathi', 'tamatar-mandi-dhulai-ke-baad-bachat', true, '/mr/blog'],
    ['/blog?language=gu', 'tameta-vechan-parivahan-kharch-gujarati', 'gehun-ki-buvai-sahi-samay-aur-tarika', true, '/gu/blog'],
    ['/blog?language=mr&crop=tomato', 'tamatar-vikri-vahatuk-kharch-marathi', 'tamatar-mandi-dhulai-ke-baad-bachat', false, '/mr/blog?crop=tomato'],
    ['/blog?crop=marget', null, 'tamatar-mandi-dhulai-ke-baad-bachat'],
  ]) {
    const responses = {};
    let result;
    for (let pass = 0; pass < 3; pass++) {
      result = await renderPage(route, responses);
      const missing = result.requested.filter(request => !responses[request]);
      if (!missing.length) break;
      for (const request of missing) {
        const url = new URL(request, 'https://fixture.invalid');
        assert.equal(url.pathname, '/cms/blog');
        responses[request] = { data: listEditorialPosts(posts, Object.fromEntries(url.searchParams)) };
      }
    }
    const html = result.head + result.html;
    assert.match(html, indexable ? /content="index, follow, max-image-preview:large"/ : /content="noindex, follow"/, route);
    if (canonicalPath) assert.ok(html.includes(`rel="canonical" href="https://sahibhav.in${canonicalPath}"`), `${route}: canonical represents the actual view`);
    if (indexable) {
      const requested = new URL(route, 'https://sahibhav.in');
      assert.equal(blogRedirectPath(requested.pathname, requested.searchParams), canonicalPath, 'language-only query redirects to the native indexable library');
    }
    if (expected) assert.ok(linksToArticle(html, expected), `${route}: matching article is visible`);
    assert.ok(!linksToArticle(html, excluded), `${route}: unrelated featured/card is not shown`);
  }
});
test('published article HTML exposes its own social thumbnail, source links and updated structured data', { skip: built ? false : 'Run npm run build to generate the editorial pages.' }, () => {
  for (const post of articles) {
    const html = readFileSync(path.join(root, 'dist/blog', `${post.slug}.html`), 'utf8');
    const head = html.split('</head>')[0];
    assert.equal((html.match(/<h1\b/g) || []).length, 1, post.slug);
    assert.equal((head.match(/<title\b/g) || []).length, 1, post.slug);
    assert.ok(head.includes(`content="https://sahibhav.in${post.coverImage}"`), `${post.slug}: social cover`);
    assert.ok(html.includes(`src="${post.coverImage}"`), `${post.slug}: visible cover`);
    assert.ok(html.includes(`${post.coverImage.replace('.webp', '-640.webp')} 640w`), `${post.slug}: responsive cover markup`);
    assert.match(head, new RegExp(`property="og:image:width" content="${imageManifest[post.coverImage].width}"`), `${post.slug}: share image width`);
    assert.match(head, new RegExp(`property="og:image:height" content="${imageManifest[post.coverImage].height}"`), `${post.slug}: share image height`);
    assert.ok(html.includes('id="sources-title"'), `${post.slug}: visible source section in article language`);
    for (const source of post.sources) assert.ok(html.includes(`href="${source.url.replaceAll('&', '&amp;')}"`), `${post.slug}: clickable primary source`);
    const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    const posting = schemas.flatMap(item => item['@graph'] || [item]).find(item => item['@type'] === 'BlogPosting');
    assert.ok(posting, `${post.slug}: BlogPosting`);
    assert.equal(posting.author['@type'], 'Organization');
    assert.equal(posting.dateModified, post.updatedAt);
    assert.equal(posting.inLanguage, post.language);
    assert.match(html, new RegExp(`<html[^>]*\\blang="${post.language}"`), `${post.slug}: document language`);
    assert.ok(JSON.stringify(posting.image).includes(post.coverImage));
    if (post.translationGroup) {
      for (const translated of articles.filter(item => item.translationGroup === post.translationGroup)) {
        const alternate = new RegExp(`<link[^>]+rel="alternate"[^>]+hrefLang="${translated.language}"[^>]+href="https://sahibhav.in/blog/${translated.slug}"`, 'i');
        assert.match(head, alternate, `${post.slug}: reciprocal ${translated.language} alternate including self`);
        if (translated.slug !== post.slug) assert.ok(linksToArticle(html, translated.slug), `${post.slug}: visible language navigation`);
      }
    }
  }
});
