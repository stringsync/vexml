### The rule

Place an ornament's accidental above the ornament when it alters the upper note and below the ornament when it alters the lower note. See Behind Bars p. 84.

### The test case

`accidentals.musicxml` gives each case its own measure.

- Measure 8. D5 half note with a trill and a flat accidental-mark (upper note E flat); A4 half note with a mordent and a sharp accidental-mark (lower note G sharp). Neither mark has a placement.

### Renderers

- Behind Bars: agrees, an upper-note accidental above the ornament and a lower-note one below it
- MuseScore: differs, draws the trill and mordent with neither accidental
- Verovio: differs, the flat above the trill but no sharp on the mordent
- OSMD: differs, both accidentals below their ornaments, the trill’s flat included

### Checks

1. Does the trill's flat sit above the trill sign?
   Crop: measure 8, 8 above, 3 below
   Book: p. 84, 0.36 0.59 0.22 0.055
2. Does the mordent's sharp sit below the mordent sign, between it and the note?
   Crop: measure 8, 8 above, 3 below
   Book: p. 84, 0.36 0.59 0.22 0.055
