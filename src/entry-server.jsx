import React from 'react';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream, renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ApiSnapshotProvider } from './context/ApiSnapshotContext';
import App from './App';
import MandiJiDashboard from './MandiJiDashboard';

export function renderPage(url, responses = {}, { asOf } = {}) {
  const pathname = String(url).split('?')[0];
  const initialPage = pathname === '/' || /^\/mandi-bhav\/[^/]+\/?$/.test(pathname)
    ? { kind: 'dashboard', Component: MandiJiDashboard } : undefined;
  const requested = new Set();
  const helmetContext = {};
  const tree = <HelmetProvider context={helmetContext}><StaticRouter location={url}>
    <ApiSnapshotProvider value={{ responses, asOf, collect: path => requested.add(path) }}>
      <App prerender initialPage={initialPage} />
    </ApiSnapshotProvider>
  </StaticRouter></HelmetProvider>;
  return new Promise((resolve, reject) => {
    let failure;
    let piped = false;
    const output = new PassThrough();
    output.on('data', () => {});
    output.on('error', reject);
    output.on('end', () => {
      clearTimeout(timer);
      if (failure) return reject(failure);
      try {
      // Streaming primes lazy routes. A second synchronous render produces the
      // finished static document, without hidden streamed segments that require
      // React's browser scripts to move the price table into its final position.
      const html = renderToString(tree);
      const helmet = helmetContext.helmet;
      resolve({ html, requested: [...requested],
        htmlAttributes: helmet?.htmlAttributes?.toString() || '',
        head: ['title', 'meta', 'link', 'script'].map(key => helmet?.[key]?.toString() || '').join('\n') });
      } catch (error) { reject(error); }
    });
    const stream = renderToPipeableStream(
      tree,
      { onAllReady() { if (!piped) { piped = true; stream.pipe(output); } }, onShellError: reject, onError(error) { failure = error; } },
    );
    const timer = setTimeout(() => { stream.abort(); reject(new Error(`Prerender timed out: ${url}`)); }, 20000);
  });
}
