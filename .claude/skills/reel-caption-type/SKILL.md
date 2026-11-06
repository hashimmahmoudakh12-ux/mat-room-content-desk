---
name: reel-caption-type
description: >-
  The house caption typography — a bold serif with strong stroke contrast, set very tight,
  white, centred, sentence case. Use this whenever producing on-screen text for the user's
  videos or brand — reel and short captions, subtitle or title cards, hook text burned over
  footage, thumbnails, cover frames, or any poster, graphic or web page meant to match the
  videos. Also use it when the user says "my font", "our font", "the usual caption style", "make
  it match the reels", or asks for a caption, hook or title treatment without naming a typeface.
  Reach for it before picking any typeface for the user's own content, even when they do not
  mention type at all.
---

# Reel caption typography

This is the look the user already uses on their videos: one short line of bold,
high-contrast serif, white, dead centre of frame, set very tight, floating
straight on the footage with no box and no outline. It reads as editorial and
deliberate rather than as a social-media caption, which is the whole point — it
makes a phone-shot clip look like it was art-directed.

`assets/reference-frames.jpg` is the ground truth, pulled from the user's own
edit. Look at it before producing anything, because the restraint is the style:
one line, nothing decorating it.

## The typeface

Use **Lora, weight 700**.

```
https://fonts.googleapis.com/css2?family=Lora:wght@700&display=swap
font-family: 'Lora', 'Playfair Display', Georgia, 'Times New Roman', serif;
```

It is free (OFL), on Google Fonts, and present in most editors. It matches the
reference on the traits that define the look: moderate-to-high stroke contrast,
sturdy wedge serifs, a single-storey `g`, a teardrop `r` terminal, and bowls
that stay readable when the line is squeezed.

**Playfair Display 700** is the alternative, and the better pick when the piece
wants more drama — it is the same shape language with hairline thins and sharper
serifs. Swapping between them is a one-line change; nothing else in this file
depends on which one is used.

Be honest about the limit here: the reference was identified from a compressed
8-second clip, so the exact family is unconfirmed. Measured against the frame,
the caption is more tightly set than any free face at default spacing, and its
stroke contrast sits between Lora's and Playfair's — so the original may be a
commercial face such as Tiempos Headline, Canela or Financier, or a condensed
cut. If the user names the real font, use it and change the two lines above.
The tracking and treatment below matter far more to the look than the family
does, so they hold either way.

## The treatment

Measured off the reference, expressed against frame height so it holds at any
resolution:

| | Value | Notes |
|---|---|---|
| Size | cap height ≈ **3.2% of frame height** (font-size ≈ 4.6%) | ≈88px on a 1920-tall vertical frame; ≈50px on a 1080-tall one |
| Weight | 700 | never lighter — the thins disappear over footage |
| Tracking | **−0.06em** (range −0.05 to −0.09) | the single most important value; see below |
| Case | **Sentence case** | not all-caps, not Title Case |
| Colour | pure white `#FFFFFF` | |
| Position | horizontally centred, vertically **centred** | the reference sits dead centre, not lower-third |
| Lines | **one**, occasionally two | if it needs three, the line is too long — cut words |
| Shadow | soft, `0 2px 12px rgba(0,0,0,.45)` | present for legibility, never visible as a shadow |

Tracking is what most people get wrong, and it is what makes this look
specific rather than generic. Set at default spacing the same words in the same
font read as an ordinary caption; the reference is roughly 20% narrower than any
of these faces set normally, with word spaces squeezed almost shut, so the line
lands as one compressed block. Push it until the letters are nearly touching,
then back off only where glyphs actually collide.

## Writing the line

The type style only works with the right copy. The reference lines are
`Boys doom scroll` and `Men go outside.` — three or four words, present tense,
one idea, no hashtags, no emoji, no exclamation marks. The line states
something flatly and lets the footage carry the feeling. A full stop is
optional and lands as a tone choice: with one, drier and more final; without,
more open.

Long captions break this style. If a thought needs a sentence and a half, it
belongs in the post copy, not burned on the frame.

## Applying it

**Web / CSS**

```css
.caption {
  font-family: 'Lora', 'Playfair Display', Georgia, serif;
  font-weight: 700;
  font-size: clamp(28px, 4.6vh, 96px);
  letter-spacing: -0.06em;
  color: #fff;
  text-align: center;
  text-shadow: 0 2px 12px rgba(0, 0, 0, .45);
}
```

**Burning onto footage or a still** — `scripts/burn-caption.sh` applies the
whole spec with ffmpeg and fetches the font on first run:

```bash
scripts/burn-caption.sh input.mp4 "Men go outside." output.mp4
```

**In an editor (CapCut, Premiere, Resolve)** — Lora, Bold, white,
no stroke, no background, tracking roughly −60 (CapCut) or −60/1000 (Premiere),
centred both ways, with a soft drop shadow at about 45% opacity and a wide
blur. Keep the caption static; this style does not animate word by word.

## What breaks it

Each of these is common and each one undoes the editorial feel:

- All-caps, or Title Case — the reference is sentence case and the lowercase is
  what makes it read as a sentence rather than a label
- A stroke, outline, box, pill or lozenge behind the text
- A sans-serif, or a light weight of the serif
- Default or positive tracking — on its own this loses most of the look
- Lower-third placement, or hugging the safe-area edge
- Two or more styles on one frame, or a second accent colour
- Animated per-word pop-ons, karaoke highlighting, or a drop shadow heavy
  enough to see as a shadow
