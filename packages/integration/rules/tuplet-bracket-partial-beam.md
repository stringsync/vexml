### The rule

Draw a bracket whenever a tuplet is only part of a longer beam so the numeral does not appear to apply to the entire beam. See Behind Bars p. 200.

### The test case

`tuplets-placement.musicxml` joins a sixteenth-note triplet and a following plain eighth note under one primary beam with no explicit `bracket` attribute.

- Measure 10. Single beam joining a 3:2 sixteenth triplet (G4, A4, B4) and a plain eighth note (C5), followed by a quarter rest.

### Renderers

- Behind Bars: agrees, draws a bracket enclosing only the three triplet sixteenth notes
- MuseScore: differs, omits the bracket and prints only the `3` above the beam
- Verovio: agrees, draws a bracket enclosing only the three triplet sixteenth notes
- OSMD: differs, omits the bracket and prints only the `3` above the beam

### Checks

1. In measure 10, is a bracket drawn over just the three triplet sixteenths inside the four-note beam?
   Crop: measure 10, 5 above, 3 below
   Book: p. 200, 0.16 0.40 0.31 0.05
