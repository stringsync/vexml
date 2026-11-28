### The rule

When the score places a cautionary or editorial accidental above its note, draw it small and directly above the note rather than before it. See Behind Bars p. 83.

### The test case

`accidentals.musicxml` gives each case its own measure.

- Measure 7. C5 half note with a sharp accidental-mark, then B4 half note with a flat accidental-mark, neither on an ornament and neither with a placement.

### Renderers

- Behind Bars: agrees, small accidentals directly above their notes
- MuseScore: differs, draws neither mark
- Verovio: agrees, a small sharp above C5 and a small flat above B4
- OSMD: differs, draws neither mark

### Checks

1. Is a small sharp drawn above C5 and a small flat above B4?
   Crop: measure 7, 6 above, 3 below
   Book: p. 83, 0.33 0.61 0.34 0.055
