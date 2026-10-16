import { useState } from 'react';
import { Sprout } from 'lucide-react';
import { getEditorialLabels } from '@/utils/editorialLabels';

/** Keep the thumbnail area useful even if its optional CMS image is missing. */
export default function EditorialImage({ src, alt = '', className = '', language = 'hi', style, ...props }) {
  const [failedSource, setFailedSource] = useState(null);
  if (!src || failedSource === src) {
    return <div className={`sb-editorial-image-fallback ${className}`.trim()} role="img" aria-label={alt || getEditorialLabels(language).fallback} style={{ width: '100%', height: '100%', minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, background: '#edf1e4', color: '#54734b', textAlign: 'center', ...style }}>
      <Sprout size={44} strokeWidth={1.4} aria-hidden="true" />
      <span style={{ maxWidth: 280, fontSize: 12, lineHeight: 1.7 }}>{getEditorialLabels(language).fallback}</span>
    </div>;
  }
  return <img {...props} src={src} alt={alt} className={className} style={style} onError={() => setFailedSource(src)} />;
}
