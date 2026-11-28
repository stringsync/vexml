### The rule

Place accents and staccato wedges outside the stave, moving them in only when they would be far from the note. See Behind Bars p. 120.

### The test case

`articulation-marks.musicxml` isolates each rule by measure.

- Measure 2. An accent on each of four notes inside the stave.

### Renderers

- Behind Bars: agrees, accents outside the stave
- MuseScore: agrees, all outside the stave
- Verovio: agrees, all outside the stave
- OSMD: differs, the last accent sits inside the stave

### Checks

1. Is each accent outside the stave?
   Crop: measure 2, 5 above, 6 below
