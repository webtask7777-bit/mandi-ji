import { useSyncExternalStore } from 'react';
import { getLanguage, normalizeLanguage, LANGUAGE_STORAGE_KEY } from '../../shared/languages.js';
const serverSnapshot = () => null;
function subscribeStorage(callback) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}
function savedSnapshot() {
  try { const item = getLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)); return item?.status === 'available' ? item.code : null; }
  catch { return null; }
}
function subscribeBrowserLanguage(callback) {
  window.addEventListener('languagechange', callback);
  return () => window.removeEventListener('languagechange', callback);
}
function browserSnapshot() {
  return (navigator.languages || [navigator.language]).map(normalizeLanguage).map(getLanguage).find(item => item?.status === 'available')?.code || null;
}
export function useRememberedLanguage() { return getLanguage(useSyncExternalStore(subscribeStorage, savedSnapshot, serverSnapshot)); }
export function useSuggestedLanguage() { return getLanguage(useSyncExternalStore(subscribeBrowserLanguage, browserSnapshot, serverSnapshot)); }
