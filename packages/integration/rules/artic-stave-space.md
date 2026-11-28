### The rule

Centre articulation on the stave in a stave-space, so a line never obscures it. See Behind Bars p. 119–120.

### The test case

`articulation.musicxml` isolates each rule by measure.

- Measure 3. Staccato on notes sitting in spaces.
- Measure 4. Staccato on notes sitting on lines.

### Renderers

- Behind Bars: agrees, dots centred in spaces
- MuseScore: agrees, dots in spaces clear of lines
- Verovio: agrees, dots in spaces clear of lines
- OSMD: agrees, dots in spaces clear of lines

### Checks

1. Do the dots in measure 3 sit in the middle of spaces, clear of the lines?
   Crop: measure 3, 4 above, 6 below

2. Do the dots in measure 4 sit in the middle of spaces, clear of the lines?
   Crop: measure 4, 4 above, 6 below
