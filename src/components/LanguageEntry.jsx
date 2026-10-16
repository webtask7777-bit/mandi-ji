import { Link } from 'react-router-dom';
import { Languages } from 'lucide-react';
import { useRememberedLanguage } from '../hooks/useLanguagePreference';
import { languagePath } from '../../shared/languages.js';

export default function LanguageEntry({ className = '' }) {
  const saved = useRememberedLanguage();
  // A remembered language (other than this Hindi dashboard) opens directly on the next visit.
  if (saved && saved.code !== 'hi') {
    return <Link className={`sb-language-entry ${className}`} to={languagePath(saved.code)} lang={saved.code} aria-label={`${saved.name} / ${saved.english}`}><Languages size={18} aria-hidden="true" /><span>{saved.name}</span><span className="sb-language-saved-dot" aria-hidden="true">●</span></Link>;
  }
  return <Link className={`sb-language-entry ${className}`} to="/languages" aria-label="भाषा चुनें / Choose language"><Languages size={18} aria-hidden="true" /><span>भाषा / Language</span>{saved && <span className="sb-language-saved-dot" title={saved.english} aria-hidden="true">●</span>}</Link>;
}
