import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import { ApiSnapshotProvider } from './context/ApiSnapshotContext.jsx'

let initialResponses = {};
const snapshotElement = document.getElementById('sahibhav-public-data');
try { initialResponses = JSON.parse(snapshotElement?.textContent || '{}'); } catch { /* API revalidation still works */ }

async function mountApp() {
let initialPage;
if (snapshotElement) {
  const path = window.location.pathname;
  // Keep useful HTML visible until the current lazy route is ready.
  if (/^\/crop\//.test(path) || /^\/mandi-bhav\/[^/]+\/[^/]+\/?$/.test(path)) initialPage = { kind: 'crop', Component: (await import('./pages/CropDetailPage.jsx')).default };
  else if (/^\/blog\/.+/.test(path)) initialPage = { kind: 'article', Component: (await import('./pages/BlogArticlePage.jsx')).default };
  else if (path === '/delivery-calculator') initialPage = { kind: 'delivery', Component: (await import('./pages/TransportPage.jsx')).default };
}
document.head.querySelectorAll('[data-sb-seo], [data-rh="true"]').forEach(element => element.remove());
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AppErrorBoundary>
          <ApiSnapshotProvider value={{ responses: initialResponses }}>
            <App prerender={!!snapshotElement} initialPage={initialPage} />
          </ApiSnapshotProvider>
        </AppErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
}
mountApp().catch(() => { /* Keep the readable prerendered page if its bundle cannot load. */ });
