### The rule

When a hairpin is broken for an interim dynamic, keep the same angle on both sides so it reads as one gradual change. See Behind Bars p. 107.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 13. `p`, a crescendo, `mp`, a second crescendo of the same slope, and `f`.

### Renderers

- Behind Bars: agrees, keeps one angle across the interim dynamic
- MuseScore: agrees, keeps one angle across the interim dynamic
- Verovio: agrees, keeps one angle across the interim dynamic
- OSMD: agrees, keeps nearly one angle across the interim dynamic

### Checks

1. Do the two hairpins in measure 13 open at the same angle?
   Crop: measure 13, 2 above, 7 below
   Book: p. 107, 0.26 0.41 0.46 0.025
