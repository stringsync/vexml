### The rule

Put accents on the first and last notes of a slur outside it, so the slur stays close to the noteheads. See Behind Bars p. 121–122.

### The test case

`articulation-marks.musicxml` isolates each rule by measure.

- Measure 5. A slur with an accent on its first and last notes.

### Renderers

- Behind Bars: agrees, end accents outside the slur
- MuseScore: agrees, accents above the slur ends
- Verovio: differs, accents between slur ends and heads
- OSMD: agrees, accents above the slur ends

### Checks

1. Are the first and last accents outside the slur?
   Crop: measure 5, 5 above, 6 below
