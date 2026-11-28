### The rule

Keep equal note values evenly spaced within a system, even when the tempo changes. (Behind Bars p. 40)

### The test case

`rhythmic-spacing.musicxml` uses matching quarter-note patterns on opposite sides of a tempo instruction.

### Renderers

- Behind Bars: agrees, its p. 40 example keeps eighths evenly spaced through tempo changes
- MuseScore: agrees, the quarters keep one interval either side of the tempo text
- Verovio: agrees, the quarters keep one interval either side of the tempo text
- OSMD: agrees, the quarters keep one interval either side of the tempo text

### Checks

1. Are the quarter-note intervals the same before and after the tempo instruction?
   Crop: measure 3, from 0 spaces, 42 spaces, 4 above
   Book: p. 40, 0.10 0.57 0.69 0.06
