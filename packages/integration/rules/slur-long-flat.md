### The rule

Flatten a long slur so it stays close to the stave rather than bowing far out. See Behind Bars p. 109.

### The test case

`slurs.musicxml` isolates each rule by measure.

- Measure 3. A short slur over two level notes.
- Measure 4. A long slur over eight level notes.

### Renderers

- Behind Bars: agrees, flattens the long slur
- MuseScore: agrees, flattens the long slur
- Verovio: agrees, flattens the long slur, a little rounder
- OSMD: agrees, flattens the long slur

### Checks

1. Is the long slur in measure 4 flatter than the short one in measure 3?
   Crop: measure 4, 5 above, 3 below
   Book: p. 109, 0.27 0.85 0.46 0.055

2. Does the long slur in measure 4 stay within two stave-spaces of the notes?
   Crop: measure 4, 5 above, 3 below
   Book: p. 109, 0.27 0.85 0.46 0.055
