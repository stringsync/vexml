### The rule

Stop a tie short of the system’s last barline, and resume it after the clef, key and time signature on the next system. The tie then reads as continuing rather than ending at a barline or signature. See Behind Bars p. 65.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 22 ends a system with a G4 whole note tied into measure 23, which opens the next system with a new key and metre.

### Renderers

- Behind Bars: agrees, stops before the barline and resumes after the signatures
- MuseScore: agrees, stops before the barline and resumes after the time signature
- Verovio: differs, runs to the barline and resumes at the system's left edge
- OSMD: differs, runs to the barline and resumes on the time signature

### Checks

1. Does the first half stop short of the barline?
   Crop: measure 22, 3 above, 4 below
2. Does the second half start after the time signature?
   Crop: measure 23, 3 above, 4 below
