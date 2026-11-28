### The rule

Place an open-string zero above the stave in single-voice writing regardless of stem direction. See Behind Bars p. 395.

### The test case

`strings-techniques.musicxml` attaches `<open-string/>` without explicit `placement`.

- Measure 3. Single-voice quarter notes (up-stem D4 and A4, down-stem E5, up-stem A4) each marked as an open string.

### Renderers

- Behind Bars: agrees, places open-string zeros above the stave regardless of stem direction
- MuseScore: agrees, places all four open-string circles above the stave regardless of stem direction
- Verovio: agrees, places all four open-string circles above the stave regardless of stem direction
- OSMD: differs, places open-string `0` on the notehead side (below the stave for up-stem notes)

### Checks

1. Do all four open-string marks in measure 3 sit above the stave regardless of stem direction?
   Crop: measure 3, 5 above, 2 below
   Book: p. 395, 0.20 0.16 0.60 0.09
