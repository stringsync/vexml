### The rule

Keep each half of a broken tie a symmetrical arc. A lopsided half looks like a slur or a glissando line. See Behind Bars p. 65.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 22 ends a system with a G4 tied into measure 23.

### Renderers

- Behind Bars: agrees, each half a symmetrical arc
- MuseScore: agrees, each half a symmetrical arc
- Verovio: differs, the first half drops and runs flat to the barline
- OSMD: agrees, each half a symmetrical arc

### Checks

1. Is the first half symmetrical?
   Crop: measure 22, 3 above, 4 below
2. Is the second half symmetrical?
   Crop: measure 23, 3 above, 4 below
