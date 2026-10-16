# SahiBhav editorial thumbnail set

Updated 17 October 2026. Three new visuals were created with the built-in image_gen tool: Marathi and Gujarati versions of the tomato guide cover, and the main guide-library share cover. Existing eight Hindi covers remain in use.

## Production assets

| Cover | Full-size path | Dimensions | 640px version |
|---|---|---|---|
| bheega-dhan | `/editorial/bheega-dhan.webp` | 1672×941 | 56.1 KiB |
| dhan-katai-barish | `/editorial/dhan-katai-barish.webp` | 1672×941 | 62.9 KiB |
| dhan-ke-baad-rabi | `/editorial/dhan-ke-baad-rabi.webp` | 1672×941 | 61.4 KiB |
| fasal-nuksan-suchna | `/editorial/fasal-nuksan-suchna.webp` | 1672×941 | 48.7 KiB |
| gehun-buvai | `/editorial/gehun-buvai.webp` | 1672×941 | 44.0 KiB |
| journal-overview | `/editorial/journal-overview.webp` | 1672×941 | 63.1 KiB |
| pala-sabji-taiyari | `/editorial/pala-sabji-taiyari.webp` | 1672×940 | 48.3 KiB |
| raipur-krishi-mausam | `/editorial/raipur-krishi-mausam.webp` | 1672×941 | 41.2 KiB |
| tamatar-mandi-kharch-gu | `/editorial/tamatar-mandi-kharch-gu.webp` | 1672×941 | 60.8 KiB |
| tamatar-mandi-kharch-mr | `/editorial/tamatar-mandi-kharch-mr.webp` | 1672×941 | 61.2 KiB |
| tamatar-mandi-kharch | `/editorial/tamatar-mandi-kharch.webp` | 1672×941 | 61.9 KiB |

All covers have 640px and 960px WebP candidates, plus the full-size source. Cards, article covers and delivery-resource links use the shared responsive image component. Full-size covers remain the OG/Twitter images. Illustration labels stay visible.

The source manifest is `src/data/editorialImages.json`. Rebuild proportional derivatives with `python scripts/prepare-editorial-images.py` after approving a new image. Pillow is needed only for this maintenance step.

## New generation prompts

### thumbnail-prompts-marathi.json

Use case: text-localization. Asset type: SahiBhav agricultural article thumbnail, 16:9.
Input image: EDIT TARGET /workspace/repos/mandi-ji/public/editorial/tamatar-mandi-kharch.webp.
Replace ONLY the large Hindi headline and tiny bottom-right Hindi illustration label with accurate Marathi. Keep the entire illustrated photoreal scene, farmer from behind, tomato crates, white pickup truck, forked rural road, two market sheds, foliage, lighting, forest-green ivory gold palette and exact composition unchanged. Preserve SAHIBHAV top-left unchanged.
Large headline must have EXACTLY TWO lines, with professionally typeset bold, large, perfectly correct Devanagari:
Line 1 in forest green: "बाजारभावासोबत"
Line 2 in gold: "पूर्ण खर्च मोजा"
Scale the text to fit in existing left-side ivory headline area without cropping, covering the farmer, or adding a third line. Keep original underline stroke.
Tiny bottom-right label in white must read exactly: "प्रातिनिधिक चित्र".
No old Hindi headline or old label remains. Do not add any other text or objects. Preserve the entire image and composition except these requested text substitutions.

### thumbnail-prompts-gujarati.json

Use case: text-localization.
Asset type: professional Gujarati article thumbnail for SahiBhav farming website.
Input image: the referenced local file is the EDIT TARGET.
Preserve the ENTIRE existing photoreal illustrated scene, every object and position: farmer contemplating the forked dirt road, tomato crates, white pickup truck, two distant market sheds, trees, fields, lighting, proportions, ivory negative space, forest-green and golden ochre color palette. Preserve wide 16:9 composition exactly. No additions.
Change ONLY the in-image Hindi text to Gujarati:
Top-left SAHIBHAV wordmark remains unchanged.
Replace the large Hindi headline completely with precisely TWO lines, matching the large professional bold typographic style and its left area:
Line 1 in forest green: "બજારભાવ સાથે"
Line 2 in golden ochre: "પૂરો ખર્ચ ગણો"
Use flawless Gujarati glyphs, conjuncts and vowel marks. Exact verbatim Gujarati wording. No Devanagari/Hindi headline remains. Retain the green brush underline.
At bottom-right replace the small Hindi illustration disclosure with exact Gujarati: "પ્રતીકાત્મક ચિત્ર" in small white legible type.
Do not alter anything else. High quality crisp output.

### thumbnail-prompts-journal.json

Use case: ads-marketing. Asset type: one finished premium editorial share-preview thumbnail for Indian agriculture knowledge platform SAHIBHAV. Create a landscape 16:9, 2048x1152 composition matching an elegant agricultural magazine series. Warm ivory #F7F2E7 quiet background across left 47%, forest green #174C3C typography, harvest gold #B78525 accent, rich natural tomato red and crop green. Photorealistic painterly editorial illustration, natural anatomy and tools, refined grain, premium contemporary print finish, not flat clip art or a collage of panels. Left: small letterspaced uppercase SAHIBHAV near top-left, then very large beautifully set crisp Devanagari headline in exactly two lines: "खेती से मंडी तक" and "हर कदम की तैयारी". First line forest green, second line warm ochre. Keep every letter comfortably inside generous 5% outer safe margins and easily readable at a small thumbnail size. Right: a coherent rural Indian scene with golden wheat ears and drooping rice panicles in foreground, a tidy green reusable crate of fresh ripe red tomatoes, an unbranded small white Indian pickup beside a modest roofed market shed in the middle distance, green fields and warm morning light. Scene demonstrates crop preparation and sale transport, restrained rich depth, no extraneous floating UI or diagram. A calm Indian farmer in neutral everyday work clothes stands by the pickup, naturally proportioned, small within the scene. Tiny label "सांकेतिक चित्र" bottom-right. Only the specified words. No fabricated prices, numbers, forecasts, charts, official seals, flags, map, watermarks or vehicle logos. Output ONE finished image, not a contact sheet.

Existing Hindi cover prompts are preserved in `content/editorial/thumbnail-prompts-harvest.json` and `content/editorial/thumbnail-prompts-weather.json`.
