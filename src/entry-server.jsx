import React from 'react';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ApiSnapshotProvider } from './context/ApiSnapshotContext';
import App from './App';

export function renderPage(url, responses = {}) {
  const requested = new Set();
  const helmetContext = {};
  return new Promise((resolve, reject) => {
    let failure;
    let piped = false;
    const output = new PassThrough();
    const chunks = [];
    output.on('data', chunk => chunks.push(chunk));
    output.on('error', reject);
    output.on('end', () => {
      clearTimeout(timer);
      if (failure) return reject(failure);
      const helmet = helmetContext.helmet;
      resolve({ html: Buffer.concat(chunks).toString(), requested: [...requested],
        htmlAttributes: helmet?.htmlAttributes?.toString() || '',
        head: ['title', 'meta', 'link', 'script'].map(key => helmet?.[key]?.toString() || '').join('\n') });
    });
    const stream = renderToPipeableStream(
      <HelmetProvider context={helmetContext}><StaticRouter location={url}>
        <ApiSnapshotProvider value={{ responses, collect: path => requested.add(path) }}>
          <App prerender />
        </ApiSnapshotProvider>
      </StaticRouter></HelmetProvider>,
      { onAllReady() { if (!piped) { piped = true; stream.pipe(output); } }, onShellError: reject, onError(error) { failure = error; } },
    );
    const timer = setTimeout(() => { stream.abort(); reject(new Error(`Prerender timed out: ${url}`)); }, 20000);
  });
}
