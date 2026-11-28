### The rule

Put articulation on the stave no closer to its note than the first clear stave-space. See Behind Bars p. 119.

### The test case

`articulation.musicxml` isolates each rule by measure.

- Measure 3. Staccato on notes sitting in spaces.
- Measure 4. Staccato on notes sitting on lines.

### Renderers

- Behind Bars: agrees, mark in the first clear space
- MuseScore: agrees, dots in the next clear space
- Verovio: agrees, dots in the next clear space
- OSMD: agrees, dots in the next clear space

### Checks

1. Is each dot in the first clear space away from its note in measure 3?
   Crop: measure 3, 4 above, 6 below

2. Is each dot in the first clear space away from its note in measure 4?
   Crop: measure 4, 4 above, 6 below
