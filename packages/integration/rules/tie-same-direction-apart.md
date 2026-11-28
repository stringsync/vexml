### The rule

Keep ties that curve the same way at least one stave-space apart, inside and outside the stave. Closer ties merge or cover the stave lines. See Behind Bars p. 66.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 12. A close-position chord on spaces, F4 A4 C5 E5 G5, tied.

### Renderers

- Behind Bars: agrees, a space between ties curving the same way
- MuseScore: agrees, a space between same-way ties
- Verovio: agrees, a space between same-way ties
- OSMD: differs, its lower ties bunch together

### Checks

1. Are neighbouring ties that curve the same way a space apart?
   Crop: measure 12, 5 above, 4 below
