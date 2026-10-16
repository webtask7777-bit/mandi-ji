import { getLanguage } from './languages.js';

// Languages with complete article UI copy and at least one published guide.
// Keep this separate from tool previews and pending national translations.
export const EDITORIAL_LANGUAGE_CODES = Object.freeze(['hi', 'en', 'as', 'bn', 'gu', 'kn', 'ml', 'mr', 'ne', 'or', 'pa', 'ta', 'te', 'ur']);
export const EDITORIAL_LANGUAGE_NAMES = Object.freeze(Object.fromEntries(
  EDITORIAL_LANGUAGE_CODES.map(code => [code, getLanguage(code).name]),
));
