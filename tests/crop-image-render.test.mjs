import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { CROP_IMAGE_CATEGORIES } from '../src/data/cropImageCategories.js';
import { getCropImage } from '../src/utils/cropImages.js';

const server = await createServer({
  configFile: new URL('../vite.config.js', import.meta.url).pathname,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'silent',
});
after(() => server.close());
const { default: CropImage, CropImageLegend } = await server.ssrLoadModule('/src/components/CropImage.jsx');
const render = props => renderToStaticMarkup(createElement(CropImage, props));

test('every image box has an inline illustration before remote artwork loads', () => {
  for (const id of [...Object.keys(CROP_IMAGE_CATEGORIES), 'unknown-new-commodity', '', null, undefined, { toString: null }]) {
    const html = render({ id, name: 'उपज' });
    const label = typeof id === 'string' ? id : 'invalid or missing ID';
    assert.match(html, /<svg[^>]+viewBox="0 0 160 160"/, label);
    if (getCropImage(id).kind === 'commodity') {
      assert.match(html, /<img[^>]+src="\/visuals\/[^" ]+\.webp"/, label);
      assert.match(html, /data-image-state="loading"/, label);
    } else {
      assert.doesNotMatch(html, /<img\b/, `${label}: no mixed category photograph`);
      assert.match(html, /data-image-state="fallback"/, label);
    }
    assert.match(html, /sb-crop-image__badge/, label);
    assert.doesNotMatch(html, /src="(?:null|undefined|)"/, label);
  }
});

test('small crop images preserve decorative semantics and contain no nested controls', () => {
  const html = render({ id: 'marget', name: 'Marget', size: 'xs' });
  assert.match(html, /class="sb-crop-image sb-crop-image--xs[^>]+aria-hidden="true"/);
  assert.match(html, /≈/);
  assert.doesNotMatch(html, /<(?:button|a|input|select|details)\b/);
  assert.doesNotMatch(html, /tabindex=/i);
});

test('informative fallback descriptions and hero disclosure remain readable', () => {
  const html = render({ id: null, name: 'नई उपज', size: 'hero', decorative: false });
  assert.match(html, /role="img"/);
  assert.match(html, /aria-label="नई उपज — [^"]*प्रतीकात्मक चित्र/);
  assert.match(html, /<span>प्रतीकात्मक<\/span>/);
  assert.doesNotMatch(html, /<img\b/);
  const exact = render({ id: 'white-peas', size: 'hero' });
  assert.match(exact, /loading="eager"/);
  assert.match(exact, /<img[^>]+alt=""/);
});

test('representative-image legend explains the visible marker without hover or interaction', () => {
  const html = renderToStaticMarkup(createElement(CropImageLegend));
  assert.match(html, /चित्र पहचान में मदद के लिए बनाए गए हैं/);
  assert.match(html, /बिक्री के माल या उसकी किस्म की तस्वीरें नहीं/);
  assert.match(html, /≈ चिह्न केवल उपज की श्रेणी बताता है/);
  assert.doesNotMatch(html, /<(?:button|details)\b/);
});

test('crop labels are escaped in accessible text', () => {
  const html = render({ id: 'unknown', name: '<img src=x onerror=alert(1)>', decorative: false });
  assert.match(html, /aria-label="&lt;img/);
  assert.doesNotMatch(html, /<img src=x/);
});
