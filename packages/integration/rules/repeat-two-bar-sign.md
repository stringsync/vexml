### The rule

Draw a two-bar repeat sign as two parallel diagonal strokes with dots bisecting the barline between the two repeated bars, centred vertically in the middle two stave-spaces. See Behind Bars pp. 232–233.

### The test case

`repeat-abbreviations.musicxml` isolates single-bar and two-bar repeats.

- Measures 7–8. A two-bar repeat (`<measure-repeat type="start">2</measure-repeat>`) following two written four-quarter bars.

### Renderers

- Behind Bars: agrees, double diagonal stroke with dots bisecting the central barline in the middle two spaces
- MuseScore: agrees, double diagonal stroke with dots bisecting the barline between measures 7 and 8 with `2` above
- Verovio: differs, draws a single-bar repeat sign centred inside measure 7 rather than bisecting the barline
- OSMD: agrees, double diagonal stroke with dots bisecting the barline between measures 7 and 8 with `2` above

### Checks

1. Does the two-bar repeat sign bisect the barline between measures 7 and 8, centred vertically in the middle two stave-spaces?
   Crop: measure 7, 3 above, 2 below
   Book: p. 233, 0.17 0.15 0.66 0.06
