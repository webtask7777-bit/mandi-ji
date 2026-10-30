/** Source requests with bounded attempts and diagnostics that never expose URLs/keys. */
const NETWORK_CODE = /^[A-Z][A-Z0-9_]{1,63}$/;

function safeFailure(error) {
  if (Number.isInteger(error?.status)) return `HTTP ${error.status}`;
  if (error?.code === 'INVALID_RESPONSE') return 'invalid source response';
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return 'request timed out';
  const codes = new Set();
  function visit(value, depth = 0) {
    if (!value || depth > 4) return;
    if (NETWORK_CODE.test(String(value.code || ''))) codes.add(value.code);
    visit(value.cause, depth + 1);
    if (Array.isArray(value.errors)) for (const nested of value.errors) visit(nested, depth + 1);
  }
  visit(error);
  return codes.size ? `network request failed (${[...codes].join(', ')})` : 'network request failed';
}

function createPageFetcher({ apiBase, apiKey, limit = 1000, fetchImpl = globalThis.fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  return async function fetchPage(offset, state, { retries = 10, timeoutMs = 45000 } = {}) {
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      throw new Error('DATA_GOV_API_KEY is not configured. Set it in the existing fetch environment before running.');
    }
    const params = new URLSearchParams({ 'api-key': apiKey, format: 'json', limit: String(limit), offset: String(offset) });
    if (state) params.set('filters[state.keyword]', state);
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimer(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`${apiBase}?${params}`, { signal: controller.signal });
        if (!response.ok) throw Object.assign(new Error('Source HTTP response'), {
          status: response.status, fatal: response.status !== 429 && response.status < 500,
        });
        const data = await response.json();
        if (!Array.isArray(data.records) || !Number.isFinite(Number(data.total)) || Number(data.total) < 0) {
          throw Object.assign(new Error('Invalid source response'), { code: 'INVALID_RESPONSE' });
        }
        return data;
      } catch (error) {
        lastError = error;
        if (error.fatal) throw new Error(`${state || 'all'} offset ${offset}: ${safeFailure(error)}`);
      } finally {
        // Includes connection rejection, non-OK status, JSON errors and success.
        clearTimer(timer);
      }
      if (attempt < retries) await sleep(Math.min(180000, 3000 * 2 ** (attempt - 1)));
    }
    throw new Error(`${state || 'all'} offset ${offset}: ${safeFailure(lastError)} after ${retries} attempts`);
  };
}

module.exports = { createPageFetcher, safeFailure };
