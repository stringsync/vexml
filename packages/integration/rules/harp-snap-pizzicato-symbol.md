### The rule

Draw a harp snap-pizzicato mark (`<snap-pizzicato/>`) as the circle-with-tick Bartók pizzicato glyph placed above the note. See Behind Bars p. 368.

### The test case

`harp-marks.musicxml` uses a single-staff treble harp part.

- Measure 6. Half notes `G4` (stem up) and `D5` (stem down), each carrying `<snap-pizzicato/>` with placement unspecified.

### Renderers

- Behind Bars: agrees, places the circle-with-tick snap-pizzicato glyph above the note
- MuseScore: agrees, draws the circle-with-tick snap-pizzicato glyph above both notes
- Verovio: agrees, draws the circle-with-tick snap-pizzicato glyph above both notes
- OSMD: differs, places the snap-pizzicato glyph below the up-stem note on the notehead side

### Checks

1. In measure 6, is the snap-pizzicato glyph drawn above both notes?
   Crop: measure 6, 6 above, 4 below
   Book: p. 367, 0.72 0.78 0.19 0.09
