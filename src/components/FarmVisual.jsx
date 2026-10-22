import '../styles/visual-banners.css';

/** Decorative farm artwork with small-screen variants and a local fallback. */
export default function FarmVisual({ name, alt = '', className = '', sizes = '(max-width: 640px) 100vw, 600px', priority = false }) {
  const root = `/visuals/${name}`;
  const fallback = '/visuals/hero-harvest.webp';
  return <img
    className={`sb-farm-visual ${className}`.trim()}
    src={`${root}.webp`}
    srcSet={`${root}-640.webp 640w, ${root}-960.webp 960w, ${root}.webp 1600w`}
    sizes={sizes}
    alt={alt}
    width="1600"
    height="900"
    loading={priority ? 'eager' : 'lazy'}
    fetchPriority={priority ? 'high' : undefined}
    decoding="async"
    onError={event => {
      const image = event.currentTarget;
      if (image.dataset.fallback) return;
      image.dataset.fallback = 'true';
      image.removeAttribute('srcset');
      image.src = fallback;
    }}
  />;
}
