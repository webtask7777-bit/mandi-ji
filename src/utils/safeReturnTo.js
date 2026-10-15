const INTERNAL_ORIGIN = 'https://sahibhav.internal';

/** Accept only an internal path; never an external URL or an authentication loop. */
export function safeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return '/';
  try {
    const target = new URL(value, INTERNAL_ORIGIN);
    const decodedPath = decodeURIComponent(target.pathname);
    if (target.origin !== INTERNAL_ORIGIN || decodedPath.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decodedPath) || /^\/(?:login|register)(?:\/|$)/i.test(decodedPath)) return '/';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch { return '/'; }
}
