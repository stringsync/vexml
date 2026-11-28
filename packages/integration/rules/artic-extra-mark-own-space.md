### The rule

Give a second articulation mark its own stave-space further from the note; never cram two into one space. See Behind Bars p. 120.

### The test case

`articulation-marks.musicxml` isolates each rule by measure.

- Measure 3. A staccato dot and an accent on each of four notes.

### Renderers

- Behind Bars: agrees, second mark in its own further space
- MuseScore: agrees, dot and accent in separate spaces
- Verovio: agrees, dot and accent in separate spaces
- OSMD: agrees, dot and accent in separate spaces

### Checks

1. Does each note's second mark sit in its own space, clear of the first?
   Crop: measure 3, 5 above, 6 below
