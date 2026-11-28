### The rule

The glissando line follows the pitches exactly, from the first notehead to the second, without starting above the first pitch or running past the last. See Behind Bars p. 141.

### The test case

`glissandos.musicxml` isolates glissando lines by measure.

- Measure 1. `C4` to `G4`, rising.
- Measure 2. `A5` to `D5`, falling.

### Renderers

- Behind Bars: agrees, line from the first notehead to the second
- MuseScore: agrees, wavy line between the heads
- Verovio: agrees, line between the heads
- OSMD: agrees, line between the heads

### Checks

1. In measure 1, does the line run from the first notehead to the second without overshooting either?
   Crop: measure 1, 4 above, 6 below
2. In measure 2, does the line run from the first notehead to the second without overshooting either?
   Crop: measure 2, 4 above, 6 below
