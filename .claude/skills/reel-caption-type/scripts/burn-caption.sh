#!/usr/bin/env bash
# Burn a house-style caption onto a video or still image.
#
#   burn-caption.sh <input> "<caption>" <output> [vertical-position]
#
# vertical-position defaults to 0.5 (dead centre, as in the reference).
# Use \n in the caption for a line break.
#
# Size, tracking, colour and shadow follow the reel-caption-type spec and scale
# with the input's height, so the same command is right for a 1080p still and a
# 4K vertical clip.
#
# The caption is rendered by headless Chrome into a transparent PNG and then
# composited, because the tracking is the heart of this look and ffmpeg's
# drawtext filter cannot letter-space text. With no browser available the script
# still works via drawtext, but says plainly that the result is off-spec.
set -euo pipefail

IN=${1:?input file}
TEXT=${2:?caption text}
OUT=${3:?output file}
POS=${4:-0.5}

FONT_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/reel-caption-type"
FONT="${FONT:-$FONT_DIR/Lora-Bold.ttf}"
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT

# ---- the font -------------------------------------------------------------
if [ ! -f "$FONT" ]; then
  mkdir -p "$(dirname "$FONT")"
  echo "Fetching Lora Bold..." >&2
  URL=$(curl -fsS -A "Mozilla/4.0" \
    "https://fonts.googleapis.com/css2?family=Lora:wght@700" \
    | grep -o 'https://[^)]*\.ttf' | head -1)
  [ -n "$URL" ] || { echo "Could not resolve the font URL. Install Lora Bold and set FONT=/path/to.ttf" >&2; exit 1; }
  curl -fsS -o "$FONT" "$URL"
fi

# ---- the frame ------------------------------------------------------------
read -r W H < <(ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height -of csv=p=0 "$IN" | head -1 | tr ',' ' ')
[ -n "${H:-}" ] || { echo "Could not read the dimensions of $IN" >&2; exit 1; }
SIZE=$(awk "BEGIN{printf \"%.1f\", $H * 0.046}")   # font-size = 4.6% of frame height

# ---- still image or video? ------------------------------------------------
case "${OUT,,}" in
  *.png|*.jpg|*.jpeg|*.webp) IS_IMAGE=1 ;;
  *)                         IS_IMAGE=0 ;;
esac

# ---- find a browser -------------------------------------------------------
# CHROME=none forces the ffmpeg fallback, which is useful for testing it.
CHROME="${CHROME:-}"
if [ "$CHROME" = none ]; then
  CHROME=""
elif [ -z "$CHROME" ]; then
  for c in google-chrome google-chrome-stable chromium chromium-browser \
           "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "/Applications/Chromium.app/Contents/MacOS/Chromium"; do
    if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then CHROME=$c; break; fi
  done
fi

if [ -n "$CHROME" ]; then
  # --- render the caption as a transparent overlay, with real tracking ---
  B64=$(base64 -w0 "$FONT" 2>/dev/null || base64 -i "$FONT" | tr -d '\n')
  SAFE=$(printf '%s' "$TEXT" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/\\n/<br>/g')
  SHADOW_Y=$(awk "BEGIN{printf \"%.1f\", $SIZE * 0.04}")
  SHADOW_B=$(awk "BEGIN{printf \"%.1f\", $SIZE * 0.24}")

  cat > "$WORK/cap.html" <<HTML
<meta charset="utf-8"><style>
@font-face { font-family: House; src: url(data:font/ttf;base64,$B64); font-weight: 700; }
html, body { margin: 0; width: ${W}px; height: ${H}px; background: transparent; }
.wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.caption {
  font-family: House, Georgia, serif;
  font-weight: 700;
  font-size: ${SIZE}px;
  letter-spacing: -0.06em;          /* the house tracking — do not drop this */
  color: #fff;
  text-align: center;
  line-height: 1.12;
  text-shadow: 0 ${SHADOW_Y}px ${SHADOW_B}px rgba(0,0,0,.45);
  max-width: 86%;
}
</style><div class="wrap"><div class="caption">$SAFE</div></div>
HTML

  "$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --default-background-color=00000000 \
    --window-size="$W,$H" --screenshot="$WORK/overlay.png" \
    "file://$WORK/cap.html" >/dev/null 2>&1

  [ -s "$WORK/overlay.png" ] || { echo "Chrome produced no overlay — set CHROME=/path/to/chrome, or unset it to fall back to ffmpeg." >&2; exit 1; }

  # POS shifts the caption off centre by translating the overlay.
  DY=$(awk "BEGIN{printf \"%d\", ($POS - 0.5) * $H}")
  if [ "$IS_IMAGE" = 1 ]; then
    ffmpeg -hide_banner -loglevel error -i "$IN" -i "$WORK/overlay.png" \
      -filter_complex "[0:v][1:v]overlay=0:$DY:format=auto" -frames:v 1 -y "$OUT"
  else
    ffmpeg -hide_banner -loglevel error -i "$IN" -i "$WORK/overlay.png" \
      -filter_complex "[0:v][1:v]overlay=0:$DY:format=auto,format=yuv420p[v]" \
      -map "[v]" -map 0:a? -c:a copy -y "$OUT"
  fi
  echo "Wrote $OUT — ${W}x${H}, font-size ${SIZE}px, tracking -0.06em (on spec)"
else
  # --- no browser: still usable, but say so ---
  echo "WARNING: no Chrome/Chromium found, falling back to ffmpeg drawtext." >&2
  echo "         drawtext cannot letter-space, so this comes out 15-20% wider" >&2
  echo "         than the house look. Fine for a rough cut; set tracking in the" >&2
  echo "         editor before posting, or set CHROME=/path/to/chrome." >&2
  PLAIN=$(printf '%s' "$TEXT" | sed 's/\\n/ /g')
  SHADOW_Y=$(awk "BEGIN{printf \"%d\", $SIZE * 0.04 + 1}")
  DT="drawtext=fontfile='$FONT':text='$PLAIN':fontsize=$SIZE:fontcolor=white:x=(w-text_w)/2:y=(h*$POS)-(text_h/2):shadowcolor=black@0.45:shadowx=0:shadowy=$SHADOW_Y"
  if [ "$IS_IMAGE" = 1 ]; then
    ffmpeg -hide_banner -loglevel error -i "$IN" -vf "$DT" -frames:v 1 -y "$OUT"
  else
    ffmpeg -hide_banner -loglevel error -i "$IN" -vf "$DT" -c:a copy -y "$OUT"
  fi
  echo "Wrote $OUT — ${W}x${H}, font-size ${SIZE}px, NO tracking (off spec)"
fi
