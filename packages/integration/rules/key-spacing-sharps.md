### The rule

Space key-signature sharps so the edges of adjacent crossbars align vertically without overlapping, keeping the group compact and legible. See Behind Bars p. 92.

### The test case

`keys.musicxml` isolates each key-signature rule by measure.

- Measure 2. Four sharps (F#, C#, G#, D#) in treble clef with no cancelling naturals.

### Renderers

- Behind Bars: agrees, aligns sharp crossbar edges vertically without overlapping
- MuseScore: agrees, spaces all four sharps evenly without overlapping crossbars
- Verovio: agrees, spaces all four sharps evenly without overlapping crossbars
- OSMD: agrees, spaces all four sharps evenly without overlapping crossbars

### Checks

1. Are the four sharps in measure 2 spaced evenly without overlapping crossbars?
   Crop: measure 2, 3 above, 3 below
   Book: p. 92, 0.29 0.16 0.42 0.055
