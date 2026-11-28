### The rule

In a close-position chord, start each tie in the same stave-space as its head. Each tie is then seen to belong to its own note. See Behind Bars p. 63.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 12. A close-position chord on spaces, F4 A4 C5 E5 G5, tied.

### Renderers

- Behind Bars: agrees, each tie starts in its head's space
- MuseScore: agrees, each tie starts beside its head
- Verovio: agrees, each tie starts beside its head
- OSMD: differs, the inner ties run along the stave lines

### Checks

1. Does each tie start in the same space as its head?
   Crop: measure 12, 5 above, 4 below
