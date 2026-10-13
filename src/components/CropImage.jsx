import { useState } from "react";
import { Sprout } from "lucide-react";
import "../styles/prices.css";

// Only use an image when it represents this commodity. Unknown commodities get a
// neutral crop symbol rather than a similar-looking (but incorrect) photograph.
const CROP_IMAGES = {
  paddy: "paddy", paddycommon: "paddy", paddybasmati: "paddy",
  wheat: "wheat", chana: "chana", "bengal-gramgramwhole": "chana",
  maize: "maize", mustard: "mustard", eggplant: "eggplant", brinjal: "eggplant",
  carrot: "carrot", cauliflower: "cauliflower", cabbage: "cabbage",
  "bottle-gourd": "bottle-gourd", okra: "okra", "ladies-finger": "okra",
  "lady-finger": "okra", "bhindiladies-finger": "okra",
  banana: "banana", ginger: "ginger", gingergreen: "ginger",
  cucumber: "cucumber", cucumbarkheera: "cucumber",
  coriander: "coriander", corianderleaves: "coriander",
  "bitter-gourd": "bitter-gourd", "green-banana": "green-banana",
  "banana-green": "green-banana", beetroot: "beetroot",
  amaranth: "amaranth", amaranthus: "amaranth",
  "ash-gourd": "ash-gourd", ashgourd: "ash-gourd",
};

export default function CropImage({ id, name = "", size = "md", className = "", decorative = true }) {
  const [failedSource, setFailedSource] = useState(null);
  const imageName = CROP_IMAGES[String(id || "").toLowerCase()];
  const source = imageName ? `/visuals/crop-${imageName}.webp` : null;
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
