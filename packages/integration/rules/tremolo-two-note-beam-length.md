### The rule

Stop detached two-note tremolo beams just short of each stem (or notional stem) by an equal gap on both sides, keeping them clear of the stems. See Behind Bars p. 228.

### The test case

`two-note-tremolos.musicxml` isolates each case in its own measure.

- Measure 6. A half-note tremolo (E4 to G4) and a quarter-note tremolo (D5 to F5), both with three strokes, testing beam clearance and symmetry between the stems.

### Renderers

- Behind Bars: agrees, beams stop short of each stem with equal gaps on left and right
- MuseScore: agrees, detached beams stop short of each stem with equal gaps on both sides
- Verovio: agrees, detached inner and quarter-note beams stop short of each stem with equal gaps
- OSMD: differs, diagonal strokes touch and overlap the stems on close pairs

### Checks

1. Do the detached tremolo beams stop clearly short of both stems with equal gaps on each side?
   Crop: measure 6, 3 above, 3 below
   Book: p. 228, 0.31 0.22 0.38 0.10
