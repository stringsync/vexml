### The rule

On a dotted chord, place the ties so no dot is hidden, between the dots if they fit, otherwise after them. Every dot must stay readable. See Behind Bars p. 64.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 15. A dotted half chord, F4 A4 C5 E5, tied to a quarter.

### Renderers

- Behind Bars: agrees, no dot hidden
- MuseScore: agrees, every dot clear
- Verovio: agrees, every dot clear
- OSMD: agrees, every dot clear

### Checks

1. Are all four dots clear of the ties?
   Crop: measure 15, 4 above, 4 below
