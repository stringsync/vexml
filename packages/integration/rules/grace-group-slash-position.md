### The rule

On a slashed beamed grace-note group, place the diagonal stroke at the beginning of the group, crossing the beam diagonally. See Behind Bars p. 126.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 2. Beat 3 has a three-note 16th-note beamed grace group (`D4-E4-F4` before `G4`) with `slash="yes"` on the first note.

### Renderers

- Behind Bars: agrees, draws a clear diagonal stroke across the start of the beam
- MuseScore: agrees, draws a clear diagonal stroke crossing the start of the beam
- Verovio: differs, omits the diagonal stroke on the beamed grace group
- OSMD: agrees, draws a diagonal stroke across the start of the beam

### Checks

1. Does the three-note beamed grace group in measure 2 carry a clear diagonal stroke at the beginning of the beam?
   Crop: measure 2, 3 above, 3 below
   Book: p. 126, 0.43 0.46 0.14 0.04
