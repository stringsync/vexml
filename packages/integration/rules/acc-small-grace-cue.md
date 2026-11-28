### The rule

Draw an accidental smaller only when it belongs to a grace note or a cue note; every other accidental keeps full size, so the signs stay legible. See Behind Bars p. 78.

### The test case

`accidentals.musicxml` gives each case its own measure.

- Measure 1. A grace G#4 with a sharp before a full-size F#4 whole note.
- Measure 2. A full-size F#4 half note, then a cue-size G#4 half note, each with a sharp.

### Renderers

- Behind Bars: agrees, states it in prose with no example on the page
- MuseScore: agrees, grace and cue sharps smaller than the full-size sharp
- Verovio: agrees, grace and cue sharps smaller than the full-size sharp
- OSMD: agrees, grace and cue sharps smaller than the full-size sharp

### Checks

1. Is the grace note's sharp smaller than the full-size F#4's sharp?
   Crop: measure 1, 3 above, 3 below
2. Is the cue note's sharp smaller than the full-size F#4's sharp?
   Crop: measure 2, 3 above, 3 below
