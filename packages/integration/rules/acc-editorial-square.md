### The rule

Reserve square brackets round an accidental for editorial additions. See Behind Bars p. 83.

### The test case

`accidentals.musicxml` gives each case its own measure.

- Measure 6. C#5 whole note with its sharp marked editorial.

### Renderers

- Behind Bars: agrees, states it in prose with no example on the page
- MuseScore: agrees, the sharp in square brackets
- Verovio: differs, a plain sharp above the note
- OSMD: differs, a plain sharp before the note with no brackets

### Checks

1. Is the editorial sharp drawn inside square brackets?
   Crop: measure 6, 3 above, 3 below
