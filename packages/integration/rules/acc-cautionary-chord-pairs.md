### The rule

On a chord, give each cautionary accidental its own pair of brackets rather than one pair round the group. See Behind Bars p. 83.

### The test case

`accidentals.musicxml` gives each case its own measure.

- Measure 5. F#4 and C#5 whole-note chord, both sharps marked cautionary.

### Renderers

- Behind Bars: agrees, states it in prose with no example on the page
- MuseScore: agrees, each sharp in its own round brackets
- Verovio: differs, two plain sharps with no brackets
- OSMD: differs, two plain sharps with no brackets

### Checks

1. Does each of the chord's two sharps sit inside its own pair of round brackets?
   Crop: measure 5, 3 above, 3 below
