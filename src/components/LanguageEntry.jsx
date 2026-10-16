import { Link } from 'react-router-dom';
import { Languages } from 'lucide-react';
import { useRememberedLanguage } from '../hooks/useLanguagePreference';

export default function LanguageEntry({ className = '' }) {
  const saved = useRememberedLanguage();
  return <Link className={`sb-language-entry ${className}`} to="/languages" aria-label="भाषा चुनें / Choose language"><Languages size={18} aria-hidden="true" /><span>भाषा / Language</span>{saved && <span className="sb-language-saved-dot" title={saved.english} aria-hidden="true">●</span>}</Link>;
}
