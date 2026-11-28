### The rule

Draw the cello and double-bass thumb-position mark above the stave as a circle with a downward stem, distinct from the snap pizzicato symbol whose stem points upward. See Behind Bars p. 396.

### The test case

`strings-techniques.musicxml` attaches `<thumb-position/>` without explicit `placement`.

- Measure 8. Bass-clef quarter notes (G3, A3, D3, E3) each marked with `<thumb-position/>`.

### Renderers

- Behind Bars: agrees, draws thumb position above the stave as a circle with a short vertical stem below it
- MuseScore: agrees, draws thumb position above the stave as a circle with a short vertical stem below it
- Verovio: unavailable, omits `<thumb-position/>` marks
- OSMD: unavailable, omits `<thumb-position/>` marks

### Checks

1. Are the thumb-position marks in measure 8 drawn above the stave with the vertical stroke extending downward from the circle?
   Crop: measure 8, 5 above, 2 below
   Book: p. 396, 0.42 0.405 0.40 0.09
