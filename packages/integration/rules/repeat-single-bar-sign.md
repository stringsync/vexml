### The rule

Draw a single-bar repeat sign as a diagonal beam-thickness stroke with a bold dot on either side, centred in the middle two stave-spaces and centred horizontally in the bar. See Behind Bars pp. 231–232.

### The test case

`repeat-abbreviations.musicxml` isolates single-bar and two-bar repeats.

- Measure 4. A single-bar repeat (`<measure-repeat type="start">1</measure-repeat>`) following a written four-quarter measure.

### Renderers

- Behind Bars: agrees, diagonal stroke with dots centred vertically in the middle two spaces and horizontally in the bar
- MuseScore: agrees, single-bar repeat sign centred vertically in the middle two spaces and horizontally in the bar
- Verovio: agrees, single-bar repeat sign centred vertically and horizontally (adds a repeat counter above)
- OSMD: agrees, single-bar repeat sign centred vertically in the middle two spaces and horizontally in the bar

### Checks

1. Is the single-bar repeat sign in measure 4 centred vertically in the middle two stave-spaces and horizontally in the bar?
   Crop: measure 4, 2 above, 2 below
   Book: p. 232, 0.31 0.49 0.38 0.06
