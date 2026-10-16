import { useState } from 'react';
import { Sprout } from 'lucide-react';
import { getEditorialLabels } from '@/utils/editorialLabels';
import editorialImages from '@/data/editorialImages.json';

/** Keep the thumbnail area useful even if its optional CMS image is missing. */
export default function EditorialImage({ src, alt = '', className = '', language = 'hi', style, srcSet, sizes, ...props }) {
  const [failedSource, setFailedSource] = useState(null);
  const variants = Object.hasOwn(editorialImages, src) ? editorialImages[src].candidates : [];
  const responsiveSources = srcSet || variants.map(image => `${image.src} ${image.width}w`).join(', ') || undefined;
  if (!src || failedSource === src) {
    return <div className={`sb-editorial-image-fallback ${className}`.trim()} role="img" aria-label={alt || getEditorialLabels(language).fallback} style={{ width: '100%', height: '100%', minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, background: '#edf1e4', color: '#54734b', textAlign: 'center', ...style }}>
      <Sprout size={44} strokeWidth={1.4} aria-hidden="true" />
      <span style={{ maxWidth: 280, fontSize: 12, lineHeight: 1.7 }}>{getEditorialLabels(language).fallback}</span>
    </div>;
  }
  return <img {...props} src={src} srcSet={responsiveSources} sizes={responsiveSources ? (sizes || '(max-width: 560px) calc(100vw - 32px), (max-width: 800px) 50vw, 400px') : undefined} alt={alt} className={className} style={style} onError={() => setFailedSource(src)} />;
}
