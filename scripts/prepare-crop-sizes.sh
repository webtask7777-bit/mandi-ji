#!/bin/sh
# Builds the 224px crop artwork used by phones (112px box at ~2x DPR) from the
# 512px originals. 128/ and 320/ already exist. Requires cwebp (libwebp).
set -eu
cd "$(dirname "$0")/../public/visuals"
mkdir -p 224
for source in 320/crop-*.webp; do
  name=${source#320/}
  [ -f "$name" ] || { echo "missing original: $name" >&2; exit 1; }
  cwebp -quiet -q 78 -m 6 -alpha_q 90 -resize 224 224 "$name" -o "224/$name"
done
echo "224/: $(ls 224 | wc -l | tr -d ' ') files"
