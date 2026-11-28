### The rule

When a tuplet ratio cannot be expressed in terms of the same note-value, draw written note-value glyphs beside the numerals in the ratio to define the tuplet’s duration. See Behind Bars p. 208.

### The test case

`tuplet-ratios.musicxml` gives each case its own measure.

- Measure 4. Four quarter notes in 2/4 in the time of three eighths, with `show-number="both"` and `show-type="both"`, followed by an eighth rest.

### Renderers

- Behind Bars: agrees, draws written note-value glyphs beside the ratio numerals
- MuseScore: differs, omits the note-value glyphs and prints `4:3`
- Verovio: differs, omits the note-value glyphs and prints `4:3`
- OSMD: differs, omits the note-value glyphs and prints `4:3`

### Checks

1. Does the tuplet bracket show the ratio with note-value glyphs beside the numerals (`4♩:3♪`) without colliding with the bracket?
   Crop: measure 4, 4 above, 2 below
   Book: p. 208, 0.36 0.62 0.28 0.06
