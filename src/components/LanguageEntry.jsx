import { Link, useLocation } from 'react-router-dom';
import { Languages } from 'lucide-react';
import { useRememberedLanguage } from '../hooks/useLanguagePreference';
import { dashboardLanguageContext, dashboardLanguageSection, buildLanguageChooserUrl, localizedToolsUrl } from '../utils/languageNavigation';

export default function LanguageEntry({ className = '' }) {
  const saved = useRememberedLanguage();
  const location = useLocation();
  const context = dashboardLanguageContext(location.pathname, location.search);
  const section = dashboardLanguageSection(location.pathname, location.search);
  // A remembered language (other than this Hindi dashboard) opens directly on the next visit.
  if (saved && saved.code !== 'hi') {
    return <Link className={`sb-language-entry ${className}`} to={localizedToolsUrl({ ...context, toolLanguage: saved.code }, saved.code, section)} lang={saved.code} aria-label={`${saved.name} / ${saved.english}`}><Languages size={18} aria-hidden="true" /><span>{saved.name}</span><span className="sb-language-saved-dot" aria-hidden="true">●</span></Link>;
  }
  return <Link className={`sb-language-entry ${className}`} to={buildLanguageChooserUrl({ ...context, crop: context.sourceCrop, toolSection: section })} aria-label="भाषा चुनें / Choose language"><Languages size={18} aria-hidden="true" /><span>भाषा / Language</span>{saved && <span className="sb-language-saved-dot" title={saved.english} aria-hidden="true">●</span>}</Link>;
}
