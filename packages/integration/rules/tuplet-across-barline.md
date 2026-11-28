### The rule

When a tuplet spans across a barline, extend an unbroken tuplet bracket across the barline so the player reads it as one continuous irregular group. See Behind Bars p. 210.

### The test case

`tuplet-ratios.musicxml` gives each case its own measures.

- Measures 2–3. Six quarter notes in the time of four across two 2/4 bars, with `<tuplet type="start" bracket="yes"/>` on the first note of measure 2 and `<tuplet type="stop"/>` on the last note of measure 3.

### Renderers

- Behind Bars: agrees, extends an unbroken tuplet bracket across the barline
- MuseScore: differs, closes the `6` bracket at the barline and starts a separate bracket in the next bar
- Verovio: differs, closes the `6` bracket at the end of the first bar with none in the next bar
- OSMD: differs, splits into two separate `6` brackets, one on each side of the barline

### Checks

1. Does one unbroken tuplet bracket with the numeral `6` span across the barline from measure 2 into measure 3?
   Crop: measure 2, 22 spaces, 4 above, 2 below
   Book: p. 210, 0.24 0.74 0.52 0.06
