### The rule

On a whole note (semibreve), draw tremolo strokes at the same width as on stemmed notes (slightly narrower than the whole notehead), centred horizontally on the notehead, placed above the head for notes below the middle line and below the head for notes on or above it. See Behind Bars p. 222.

### The test case

`tremolos.musicxml` gives each case its own measures.

- Measures 6–7. Whole note F4 (below middle line) with three tremolo strokes in measure 6, and whole note D5 (above middle line) with three strokes in measure 7.

### Renderers

- Behind Bars: agrees, centres single-note-width strokes on each whole notehead, above F4 and below D5
- MuseScore: agrees, centres single-note-width strokes on each whole notehead, above F4 and below D5
- Verovio: agrees, centres single-note-width strokes on each whole notehead, above F4 and below D5
- OSMD: differs, places F4's strokes below and D5's strokes above (inverted)

### Checks

1. Are the tremolo strokes centred horizontally above the low whole note F4 at single-note width?
   Crop: measure 6, 3 above, 3 below
   Book: p. 222, 0.39 0.72 0.11 0.05
2. Are the tremolo strokes centred horizontally below the high whole note D5 at single-note width?
   Crop: measure 7, 3 above, 3 below
   Book: p. 222, 0.50 0.72 0.11 0.05
