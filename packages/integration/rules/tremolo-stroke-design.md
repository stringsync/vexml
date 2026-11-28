### The rule

Draw single-note tremolo strokes slightly thinner than a beam, about the width of a notehead, and centred horizontally on the stem so they remain distinct against stave lines. See Behind Bars p. 221.

### The test case

`tremolos.musicxml` gives each case its own measure.

- Measure 2. Four quarter notes (G4 and D5 with one stroke, then G4 and D5 with three strokes).

### Renderers

- Behind Bars: agrees, strokes about notehead width, centred on the stem, slightly thinner than a beam
- MuseScore: agrees, strokes about notehead width, centred on the stem, legible thickness
- Verovio: agrees, strokes about notehead width, centred on the stem, legible thickness
- OSMD: differs, strokes are noticeably thin

### Checks

1. Are the three-stroke tremolos on beats 3 and 4 roughly notehead-wide, centred on the stem, and legible without looking too thick or too thin?
   Crop: measure 2, 3 above, 3 below
   Book: p. 221, 0.26 0.54 0.17 0.07
