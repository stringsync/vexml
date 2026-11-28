### The rule

Keep both halves of a slur across a system break on the same side of the stave. See Behind Bars p. 112.

### The test case

`slurs-structure.musicxml` isolates each rule by measure.

- Measure 1. The slur's first half, above the stave.
- Measure 2. Its second half on the new system.

### Renderers

- Behind Bars: agrees, keeps the slur above on both sides
- MuseScore: agrees, above at the end and the start
- Verovio: agrees, above at the end and the start
- OSMD: agrees, above at the end and the start

### Checks

1. Does the slur arc above the stave at the end of measure 1?
   Crop: measure 1, from 70 spaces, 17 spaces, 3 above, 6 below

2. Does the slur arc above the stave at the start of measure 2, as in measure 1?
   Crop: measure 2, 14 spaces, 3 above, 6 below
