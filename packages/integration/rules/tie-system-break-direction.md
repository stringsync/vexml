### The rule

Keep a tie’s direction over a system break even when the stems on either side differ. Both halves must read as one tie. See Behind Bars p. 65.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 22 ends a system with an up-stem G4 tied into measure 23, where the G4 eighth has its stem down.

### Renderers

- Behind Bars: agrees, both halves curve the same way
- MuseScore: agrees, both halves curve up
- Verovio: agrees, both halves curve down
- OSMD: differs, the first half curves down and the second up

### Checks

1. Does the first half curve down?
   Crop: measure 22, 3 above, 4 below
2. Does the second half also curve down?
   Crop: measure 23, 3 above, 4 below
