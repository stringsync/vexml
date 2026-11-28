### The rule

Keep single-note tremolo strokes within the stave on ledger-line notes so they are not confused with and do not collide with ledger lines. See Behind Bars p. 222.

### The test case

`tremolos.musicxml` gives each case its own measure.

- Measure 5. Ledger-line quarter notes C4, A3, A5, and C6, each with three tremolo strokes.

### Renderers

- Behind Bars: agrees, keeps the tremolo strokes inside the stave, clear of the ledger lines
- MuseScore: agrees, keeps strokes within the stave on C4, A5, and C6 and clear of ledger lines on A3
- Verovio: agrees, keeps strokes within the stave on C4, A5, and C6 and clear of ledger lines on A3
- OSMD: differs, places A3's strokes below the stave colliding with the C4 ledger line

### Checks

1. Do the tremolo strokes on C4, A3, A5, and C6 all sit within the five stave lines, clear of the ledger lines?
   Crop: measure 5, 4 above, 4 below
   Book: p. 222, 0.25 0.54 0.23 0.08
