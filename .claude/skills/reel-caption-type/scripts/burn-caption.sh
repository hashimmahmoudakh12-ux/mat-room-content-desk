#!/usr/bin/env bash
# Burn a house-style caption onto a video or still image.
#
#   burn-caption.sh <input> "<caption>" <output> [vertical-position]
#
# vertical-position defaults to 0.5 (dead centre, as in the reference).
# Size, tracking, colour and shadow follow the reel-caption-type spec and
# scale with the input's height, so the same command is right for a 1080p
# still and a 4K vertical clip.
set -euo pipefail

IN=${1:?input file}
TEXT=${2:?caption text}
OUT=${3:?output file}
POS=${4:-0.5}

FONT_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/reel-caption-type"
FONT="$FONT_DIR/Lora-Bold.ttf"

if [ ! -f "$FONT" ]; then
  mkdir -p "$FONT_DIR"
  echo "Fetching Lora Bold..." >&2
  URL=$(curl -fsS -A "Mozilla/4.0" \
    "https://fonts.googleapis.com/css2?family=Lora:wght@700" \
    | grep -o 'https://[^)]*\.ttf' | head -1)
  [ -n "$URL" ] || { echo "Could not resolve the font URL. Install Lora Bold and set FONT." >&2; exit 1; }
  curl -fsS -o "$FONT" "$URL"
fi

H=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$IN" | head -1)
SIZE=$(awk "BEGIN{printf \"%d\", $H * 0.046}")        # font-size ≈ 4.6% of frame height
SHADOW_Y=$(awk "BEGIN{printf \"%d\", $SIZE * 0.04 + 1}")

# Caveat worth knowing: ffmpeg's drawtext has no letter-spacing, so this renders
# at the font's default spacing and comes out roughly 15-20% wider than the house
# look. Good enough for a rough cut or a contact sheet; for anything shipped, set
# -0.06em tracking in CSS or -60 in the editor.
ffmpeg -hide_banner -loglevel error -i "$IN" -vf "
  drawtext=fontfile='$FONT':
  text='$TEXT':
  fontsize=$SIZE:
  fontcolor=white:
  x=(w-text_w)/2:
  y=(h*$POS)-(text_h/2):
  shadowcolor=black@0.45:
  shadowx=0:
  shadowy=$SHADOW_Y
" -c:a copy -y "$OUT"

echo "Wrote $OUT (font-size ${SIZE}px on a ${H}px-tall frame)"
