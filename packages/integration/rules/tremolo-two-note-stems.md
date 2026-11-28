### The rule

Point both stems of a two-note tremolo in the same direction and make them long enough to enclose all the tremolo beams. See Behind Bars p. 226.

### The test case

`two-note-tremolos.musicxml` isolates each case in its own measure.

- Measure 2. Two half-note tremolos (G4 to D5 and A4 to E5) whose notes sit on opposite sides of the middle line so individual stem defaults would oppose.

### Renderers

- Behind Bars: agrees, both stems point the same direction and enclose all tremolo beams
- MuseScore: agrees, both stems point down and enclose all three beams on both pairs
- Verovio: agrees, both stems point down and enclose all three beams on both pairs
- OSMD: differs, stems point in opposite directions with diagonal slashes between them

### Checks

1. Do both stems of each two-note tremolo point in the same direction and enclose all three tremolo beams?
   Crop: measure 2, 3 above, 3 below
   Book: p. 226, 0.13 0.52 0.74 0.07
