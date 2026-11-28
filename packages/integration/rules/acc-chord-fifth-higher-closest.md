### The rule

For two accidentals a fifth or less apart, put the higher one nearest the chord and offset the lower one to its left, whatever kinds of sign they are. See Behind Bars p. 88.

### The test case

`accidentals.musicxml` gives each case its own measure.

- Measure 13. G#4, D#5 half-note fifth, then A♭4, C♮5 half-note third.

### Renderers

- Behind Bars: agrees, the higher sign nearest the heads
- MuseScore: agrees, the higher sign nearest the heads, the lower to its left
- Verovio: agrees, the higher sign nearest the heads, the lower to its left
- OSMD: agrees, the higher sign nearest the heads, the lower to its left

### Checks

1. Is the higher accidental nearest the heads in both chords, the lower one to its left?
   Crop: measure 13, 4 above, 3 below
   Book: p. 88, 0.23 0.85 0.53 0.045
