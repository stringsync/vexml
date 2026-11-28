### The rule

Draw arrowed quarter-tone accidentals with clear, legible arrowheads attached to the accidental glyph (flat, natural, or sharp), pointing in the direction of the quarter-tone inflection. See Behind Bars p. 94.

### The test case

`microtones.musicxml` isolates arrowed and fixed quarter-tone accidentals by measure.

- Measure 1. Six quarter notes carrying `flat-up`, `flat-down`, `natural-up`, `natural-down`, `sharp-up` and `sharp-down`.

### Renderers

- Behind Bars: agrees, attaches clear arrowheads to flat, natural and sharp glyphs
- MuseScore: agrees, draws all six arrowed quarter-tone accidentals with clear arrowheads
- Verovio: agrees, draws all six arrowed quarter-tone accidentals with clear arrowheads
- OSMD: differs, substitutes fixed quarter-tone symbols instead of arrowed accidentals

### Checks

1. Are all six arrowed quarter-tone accidentals in measure 1 drawn with clear, legible arrowheads attached to their accidental signs?
   Crop: measure 1, 4 above, 4 below
   Book: p. 94, 0.31 0.82 0.38 0.045
