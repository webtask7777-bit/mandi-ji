import { useCallback, useState } from "react";
import { getCropCategoryImage, getCropImage } from "../utils/cropImages";
import "../styles/prices.css";

const FALLBACK_NOTE = "उपज का प्रतीकात्मक चित्र; यह किसी खास फसल या किस्म की तस्वीर नहीं है।";

// This original inline crate illustration needs neither a network request nor
// an emoji font. It stays visible until artwork loads, and after failed requests.
function CommodityPlaceholder() {
  return <svg className="sb-crop-image__placeholder" viewBox="0 0 160 160" fill="none" aria-hidden="true">
    <circle cx="80" cy="80" r="72" fill="#F3F0E5" />
    <ellipse cx="81" cy="130" rx="49" ry="8" fill="#DCE2D1" />
    <path d="M31 61 78 44l51 17-49 19-49-19Z" fill="#D6AF70" />
    <path d="m40 61 38-12 41 12-39 14-40-14Z" fill="#926B44" />
    <path d="m31 61 49 19v53l-49-19V61Z" fill="#C1955B" />
    <path d="m80 80 49-19v53l-49 19V80Z" fill="#D8B378" />
    <path d="m35 78 41 16M35 95l41 16M85 94l40-16M85 112l40-16" stroke="#8C693F" strokeWidth="3" strokeLinecap="round" opacity=".45" />
    <path d="m42 66 8 3v52l-8-3V66ZM110 68l8-3v53l-8 3V68Z" fill="#E5C48F" />
    <path d="M73 68V45" stroke="#4F7557" strokeWidth="4" strokeLinecap="round" />
    <path d="M73 55C57 54 52 43 54 34c13 0 22 8 19 21Z" fill="#729771" />
    <path d="M73 47c-1-14 9-24 23-24 1 14-8 23-23 24Z" fill="#426B4B" />
    <path d="m91 93 16-6v15l-16 6V93Z" fill="#FBF6E7" />
    <path d="m94 96 9-3m-9 7 6-2" stroke="#7E8E66" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

function CropArtwork({ image, categoryImage, name, size, className, decorative }) {
  const candidates = image.src === categoryImage.src ? [image] : [image, categoryImage];
  const [state, setState] = useState({ attempt: 0, loaded: false });
  const candidate = candidates[state.attempt];
  const source = candidate?.src;
  const hasArtwork = Boolean(candidate && state.loaded);
  const representative = !hasArtwork || candidate.kind === "category";
  const note = hasArtwork ? candidate.note : FALLBACK_NOTE;
  const description = note ? `${name ? `${name} — ` : ""}${note}` : name;

  const handleLoad = useCallback(() => {
    setState(current => current.attempt === state.attempt && !current.loaded
      ? { ...current, loaded: true } : current);
  }, [state.attempt]);
  const handleError = useCallback(() => {
    setState(current => current.attempt === state.attempt && current.attempt < candidates.length
      ? { attempt: current.attempt + 1, loaded: false } : current);
  }, [state.attempt, candidates.length]);
  const imageRef = useCallback(node => {
    // A cached/SSR image can finish before React registers its load listener.
    if (node?.complete) {
      if (node.naturalWidth > 0) handleLoad();
      else handleError();
    }
  }, [handleLoad, handleError]);

  return <span className={`sb-crop-image sb-crop-image--${size} ${className}`}
    data-image-kind={representative ? "category" : "commodity"}
    data-image-state={hasArtwork ? "loaded" : candidate ? "loading" : "fallback"}
    role={!decorative ? "img" : undefined}
    aria-label={!decorative ? description : undefined}
    aria-hidden={decorative ? true : undefined}
    title={representative ? note || FALLBACK_NOTE : undefined}>
    {!hasArtwork && <CommodityPlaceholder />}
    {candidate && <img key={source} ref={imageRef} src={source} alt="" width="512" height="512"
      className={`sb-crop-image__artwork ${hasArtwork ? "is-loaded" : "is-loading"}`}
      loading={size === "hero" ? "eager" : "lazy"} decoding="async"
      onLoad={handleLoad} onError={handleError} />}
    {representative && <span className="sb-crop-image__badge" aria-hidden="true">
      <span>≈</span>{size === "hero" && <span>प्रतीकात्मक</span>}
    </span>}
  </span>;
}

export default function CropImage({ id, name = "", size = "md", className = "", decorative = true }) {
  const image = getCropImage(id);
  const categoryImage = getCropCategoryImage(id);
  // A new crop starts a fresh load cycle, even when two IDs share an asset.
  const normalizedId = typeof id === "string" ? id.trim().toLowerCase() : "";
  const identity = `${normalizedId}|${image.src}|${categoryImage.src}`;
  return <CropArtwork key={identity} image={image} categoryImage={categoryImage}
    name={name} size={size} className={className} decorative={decorative} />;
}

export function CropImageLegend({ className = "" }) {
  return <p className={`sb-crop-image-legend ${className}`}>
    <span className="sb-crop-image-legend__symbol" aria-hidden="true">≈</span>
    <span><strong>प्रतीकात्मक चित्र</strong> · इस चिह्न वाले चित्र उपज की श्रेणी बताते हैं; वास्तविक फसल, किस्म या बिक्री के माल की तस्वीर नहीं हैं।</span>
  </p>;
}
