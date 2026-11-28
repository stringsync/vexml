### The rule

Position a single-note tremolo of only one stroke so that the stroke intersects a stave line, keeping it clear of both the notehead and the open end of the stem. See Behind Bars p. 221.

### The test case

`tremolos.musicxml` gives each case its own measure.

- Measure 2. Beats 1 and 2: quarter notes G4 (stem up) and D5 (stem down), each with a single tremolo stroke.

### Renderers

- Behind Bars: agrees, the single tremolo stroke intersects a stave line
- MuseScore: agrees, places the single stroke across the outer stave line on both notes
- Verovio: agrees, places the single stroke across an inner stave line on both notes
- OSMD: agrees, places the single stroke across the outer stave line on both notes

### Checks

1. Does the single tremolo stroke on both G4 and D5 intersect a stave line rather than sitting outside the stave?
   Crop: measure 2, 3 above, 3 below
   Book: p. 221, 0.42 0.68 0.16 0.05
