"""Create responsive WebP derivatives of the approved full-size editorial art.

Maintenance helper only; requires Pillow. Not part of the Vercel build.
No generated artwork is changed: files are proportionally resized/compressed.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
posts = json.loads((ROOT / 'server/db/data/blog-posts.json').read_text())
covers = sorted({post['coverImage'] for post in posts if post.get('coverImage', '').startswith('/editorial/')} | {'/editorial/journal-overview.webp'})
manifest = {}
for cover in covers:
    source = ROOT / 'public' / cover.lstrip('/')
    with Image.open(source) as image:
        image = image.convert('RGB')
        width, height = image.size
        candidates = []
        for target in (640, 960):
            if target >= width:
                continue
            filename = source.with_name(f'{source.stem}-{target}.webp')
            output_height = round(height * target / width)
            image.resize((target, output_height), Image.Resampling.LANCZOS).save(filename, 'WEBP', quality=82, method=6)
            candidates.append({'src': '/' + str(filename.relative_to(ROOT / 'public')), 'width': target, 'height': output_height})
        candidates.append({'src': cover, 'width': width, 'height': height})
        manifest[cover] = {'width': width, 'height': height, 'candidates': candidates}
(ROOT / 'src/data/editorialImages.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Prepared {len(covers)} approved covers with responsive candidates.')
