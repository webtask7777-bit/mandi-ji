import { useState } from "react";
import { Sprout } from "lucide-react";
import { getCropImageSource } from "../utils/cropImages";
import "../styles/prices.css";

// Only use an image when it represents this commodity. Unknown commodities get a
// neutral crop symbol rather than a similar-looking (but incorrect) photograph.
export default function CropImage({ id, name = "", size = "md", className = "", decorative = true }) {
  const [failedSource, setFailedSource] = useState(null);
  const source = getCropImageSource(id);
  const hasImage = source && failedSource !== source;
  return (
    <span className={`sb-crop-image sb-crop-image--${size} ${className}`}
      role={!decorative && !hasImage ? "img" : undefined}
      aria-label={!decorative && !hasImage ? name : undefined}
      aria-hidden={decorative ? true : undefined}>
      {hasImage ? (
        <img src={source} alt={decorative ? "" : name} width="512" height="512"
          loading={size === "hero" ? "eager" : "lazy"} decoding="async"
          onError={() => setFailedSource(source)} />
      ) : <Sprout className="sb-crop-placeholder" strokeWidth={1.5} aria-hidden="true" />}
    </span>
  );
}
