### The rule

Place overlapping parts so that a stem does not sit between a note and its tie, reversing the usual horizontal arrangement of parts if needed. See Behind Bars p. 67.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 4. At beat 1, voice 1 has untied A4 (up-stem) and voice 2 has B4 quarter tied to B4 quarter (down-stem).

### Renderers

- Behind Bars: agrees, places tied B4 right of A4 so A4’s up-stem stays clear of the tie
- MuseScore: differs, keeps B4 left of A4 and curves B4’s tie down under A4
- Verovio: differs, keeps B4 left of A4 and curves B4’s tie down under A4
- OSMD: differs, keeps B4 left of A4 and curves B4’s tie down under A4

### Checks

1. Does A4’s up-stem stay clear of the space between B4 and its tie?
   Crop: measure 4, 4 above, 4 below
