### The rule

When every stem under a slur points the same way, put the slur on the notehead side, between the outer noteheads. See Behind Bars p. 110.

### The test case

`slurs.musicxml` isolates each rule by measure.

- Measure 6. A slur over stems-up notes.
- Measure 7. A slur over stems-down notes.

### Renderers

- Behind Bars: agrees, slur on the notehead side
- MuseScore: agrees, slur on the notehead side
- Verovio: agrees, slur on the notehead side
- OSMD: agrees, slur on the notehead side

### Checks

1. Is the slur in measure 6 below the noteheads, away from the stems?
   Crop: measure 6, 3 above, 7 below
   Book: p. 110, 0.24 0.345 0.52 0.05

2. Is the slur in measure 7 above the noteheads, away from the stems?
   Crop: measure 7, 7 above, 3 below
   Book: p. 110, 0.24 0.345 0.52 0.05
