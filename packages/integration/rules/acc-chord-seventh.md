### The rule

Align two accidentals a seventh apart when their shapes stay clear of each other, as flats do; otherwise, as with two sharps, set the lower slightly to the left. See Behind Bars p. 88.

### The test case

`accidentals.musicxml` gives each case its own measure. The user chose MuseScore, Verovio, OSMD and vexml as drawn over Behind Bars: vexml aligns both flats and sharps a seventh apart.

- Measure 10. E♭4, D♭5 half-note seventh, then G#4, F#5 half-note seventh.

### Renderers

- Behind Bars: agrees, flats a seventh apart aligned and the lower of two sharps offset left
- MuseScore: differs, aligns both pairs, the sharps included
- Verovio: differs, aligns both pairs, the sharps included
- OSMD: differs, aligns both pairs, the sharps included

### Checks

1. Do both pairs of accidentals a seventh apart (flats and sharps) line up vertically, as MuseScore, Verovio and OSMD draw them?
   Crop: measure 10, 4 above, 3 below
   Book: p. 88, 0.38 0.31 0.24 0.14
