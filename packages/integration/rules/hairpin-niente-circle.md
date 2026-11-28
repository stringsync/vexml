### The rule

Draw a small circle at the closed end of a hairpin for a crescendo from nothing or a diminuendo to nothing, attached to the hairpin. See Behind Bars p. 108.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 15. A crescendo with `niente="yes"` over three quarter notes, ending at `f`.

### Renderers

- Behind Bars: agrees, a small circle attached to the point
- MuseScore: agrees, a small circle attached to the point
- Verovio: agrees, a small circle attached to the point
- OSMD: differs, draws no circle

### Checks

1. Does the hairpin in measure 15 start with a small circle attached to its point?
   Crop: measure 15, 2 above, 6 below
   Book: p. 108, 0.22 0.605 0.55 0.05
