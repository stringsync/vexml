### The rule

Draw the tuplet numeral on a single-note tremolo that abbreviates a repeated tuplet, placed at the stem end or above the stave. See Behind Bars pp. 219–220.

### The test case

`tremolos.musicxml` gives each case its own measure.

- Measure 1. Two quarter notes (A4 and C5) each carrying one tremolo stroke and a single-note 3:2 `<tuplet>` start/stop pair, followed by a half rest.

### Renderers

- Behind Bars: agrees, draws the numeral `3` beside each single-note tremolo
- MuseScore: agrees, draws a `3` tuplet indication on each single-note tremolo
- Verovio: agrees, draws a `3` numeral at the stem end of each single-note tremolo
- OSMD: differs, omits the `3` numerals entirely

### Checks

1. Does each single-note tremolo carry a clear `3` numeral for the abbreviated triplet?
   Crop: measure 1, 4 above, 4 below
   Book: p. 220, 0.28 0.39 0.44 0.06
