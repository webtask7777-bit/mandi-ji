import { useState } from "react";
import { Sprout } from "lucide-react";
import { getCropImageNote, getCropImageSource } from "../utils/cropImages";
import "../styles/prices.css";

// Use exact commodity artwork or an explicitly labelled category illustration.
// Unmapped commodities retain a neutral crop symbol.
export default function CropImage({ id, name = "", size = "md", className = "", decorative = true }) {
  const [failedSource, setFailedSource] = useState(null);
  const source = getCropImageSource(id);
  const hasImage = source && failedSource !== source;
  const imageNote = hasImage ? getCropImageNote(id) : null;
  const imageDescription = imageNote ? `${name ? `${name} — ` : ''}${imageNote}` : name;
  return (
    <span className={`sb-crop-image sb-crop-image--${size} ${className}`}
      role={!decorative && !hasImage ? "img" : undefined}
      aria-label={!decorative && !hasImage ? name : undefined}
      title={imageNote || undefined}
      aria-hidden={decorative ? true : undefined}>
      {hasImage ? (
        <img src={source} alt={decorative ? "" : imageDescription} width="512" height="512"
          loading={size === "hero" ? "eager" : "lazy"} decoding="async"
          onError={() => setFailedSource(source)} />
      ) : <Sprout className="sb-crop-placeholder" strokeWidth={1.5} aria-hidden="true" />}
    </span>
  );
}
