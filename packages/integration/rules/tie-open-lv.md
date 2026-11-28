### The rule

A short open tie extending from a notehead shows that the note is sustained beyond its written duration (laissez vibrer, MusicXML `<tied type="let-ring"/>`). See Behind Bars p. 72.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 23. Half note A4 with `<tied type="let-ring"/>`, followed by a half rest.

### Renderers

- Behind Bars: agrees, short open tie extending to the right of A4
- MuseScore: agrees, short open tie curving down to the right of A4
- Verovio: differs, draws a small vertical mark below A4 instead of an open tie
- OSMD: differs, omits the open tie

### Checks

1. Does A4 draw a short open tie extending to the right?
   Crop: measure 23, 4 above, 4 below
