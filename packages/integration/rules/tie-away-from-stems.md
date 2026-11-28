### The rule

When both stems point the same way, curve the tie away from them. The tie then sits on the open side of the heads. See Behind Bars p. 64.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 1 (A4, stems up), measure 16 (A3, stems up, then A5, stems down).

### Renderers

- Behind Bars: agrees, ties away from the stems
- MuseScore: agrees, A3 and A4 ties down, A5 up
- Verovio: agrees, A3 and A4 ties down, A5 up
- OSMD: agrees, A3 and A4 ties down, A5 up

### Checks

1. Does the A4 tie curve down, away from the up stems?
   Crop: measure 1, 3 above, 4 below
2. Does the A3 tie curve down and the A5 tie up?
   Crop: measure 16, 6 above, 6 below
