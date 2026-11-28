### The rule

Extend the stem beyond the outermost tremolo stroke, lengthening the stem beyond normal length when needed to accommodate three or more strokes. See Behind Bars p. 222.

### The test case

`tremolos.musicxml` gives each case its own measure.

- Measure 3. Quarter notes A4 with two, three, and four tremolo strokes and C5 with three strokes.

### Renderers

- Behind Bars: agrees, lengthens the stem so it extends beyond the outermost tremolo stroke
- MuseScore: agrees, extends the stem beyond the outermost stroke on every note including 3- and 4-stroke tremolos
- Verovio: agrees, extends the stem beyond the outermost stroke on every note including 3- and 4-stroke tremolos
- OSMD: agrees, extends the stem beyond the outermost stroke on every note

### Checks

1. Does the stem extend past the outermost tremolo stroke on every note, including the three- and four-stroke tremolos?
   Crop: measure 3, 4 above, 4 below
   Book: p. 222, 0.34 0.15 0.32 0.06
