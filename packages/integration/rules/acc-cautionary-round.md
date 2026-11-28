### The rule

Enclose a cautionary accidental in round brackets, the traditional way to show it is a reminder rather than an essential sign. See Behind Bars p. 83.

### The test case

`accidentals.musicxml` gives each case its own measure.

- Measure 4. C#5, D5, then C#5 again with a sharp marked cautionary (no parentheses attribute), then a rest.

### Renderers

- Behind Bars: agrees, cautionary accidentals in round brackets
- MuseScore: agrees, the cautionary sharp in round brackets
- Verovio: differs, a plain sharp with no brackets
- OSMD: differs, a plain sharp with no brackets

### Checks

1. Is the third note's cautionary sharp drawn inside round brackets?
   Crop: measure 4, 3 above, 3 below
   Book: p. 83, 0.25 0.26 0.50 0.045
