### The rule

Differentiate rim-shot strokes from normal and crossed (`x`) noteheads using distinct circled (`circled`) and circled-cross (`circle-x`) notehead glyphs (Behind Bars p. 295).

### The test case

`percussion-rimshots.musicxml`: a single-line percussion stave with four quarter notes on the line carrying default, `x`, `circle-x`, and `circled` noteheads.

### Renderers

- Behind Bars: agrees, draws distinct circled-black and circled-cross noteheads for rim shots alongside regular and crossed noteheads
- MuseScore: differs, draws `x` and `circle-x` distinctly but treats `circled` as unknown and falls back to a plain oval notehead
- Verovio: differs, draws `x` and `circle-x` distinctly but falls back to a plain oval notehead for `circled`
- OSMD: differs, draws `x` and `circle-x` distinctly but falls back to a plain oval notehead for `circled`

### Checks

1. In measure 1, are all four noteheads (normal, `x`, `circle-x`, and `circled`) drawn as distinct glyphs, with beat 3 showing a circled cross and beat 4 showing a circled black notehead?
   Crop: measure 1, 3 above, 3 below
   Book: p. 295, 0.40 0.64 0.19 0.05
