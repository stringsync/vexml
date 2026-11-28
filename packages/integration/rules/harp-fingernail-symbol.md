### The rule

Draw a fingernail-plucking mark (`<fingernails/>`) as the crescent fingernail glyph placed above the note. See Behind Bars p. 367.

### The test case

`harp-marks.musicxml` uses a single-staff treble harp part.

- Measure 5. Half notes `G4` (stem up) and `D5` (stem down), each carrying `<fingernails/>` with placement unspecified.

### Renderers

- Behind Bars: agrees, places the crescent fingernail glyph above the note
- MuseScore: agrees, draws the crescent fingernail glyph above both notes
- Verovio: agrees, draws the crescent fingernail glyph above both notes
- OSMD: differs, omits `<fingernails/>`

### Checks

1. In measure 5, is the crescent fingernail glyph drawn above both notes?
   Crop: measure 5, 6 above, 4 below
   Book: p. 367, 0.26 0.54 0.48 0.08
