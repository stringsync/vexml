### The rule

For consecutive seconds, curve parallel ties outward from the chord’s middle, one per stave-space. Each note keeps its own tie even when the outer ones stand off from their heads. See Behind Bars p. 66.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 29. A cluster F4 G4 A4, tied.

### Renderers

- Behind Bars: agrees, ties fanning outward a space apart
- MuseScore: agrees, top up and the rest down, a space apart
- Verovio: agrees, top up and the rest down, a space apart
- OSMD: agrees, top up and the rest down, a space apart

### Checks

1. Does the top tie curve up and the bottom tie down?
   Crop: measure 29, 3 above, 4 below
2. Do the three ties sit a space apart?
   Crop: measure 29, 3 above, 4 below
