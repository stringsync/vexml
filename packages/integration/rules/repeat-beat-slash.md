### The rule

Draw a repeated-beat sign as one, two, or three diagonal strokes of beam thickness (for eighth, sixteenth, or thirty-second groups) centred in the middle two stave-spaces, replacing the repeated notes without leftover stems or beams. See Behind Bars p. 230.

### The test case

`repeat-abbreviations.musicxml` tests one-, two-, and three-slash beat repeats.

- Measure 1. Beamed eighth group followed by a one-slash beat repeat, then a beamed sixteenth group followed by a two-slash beat repeat.
- Measure 2. Beamed thirty-second group followed by a three-slash beat repeat and a half rest.

### Renderers

- Behind Bars: agrees, clean diagonal slashes centred in the middle two stave-spaces with no stems or beams
- MuseScore: differs, ignores `<beat-repeat>` and draws the written-out notes
- Verovio: differs, ignores `<beat-repeat>` and draws the written-out notes
- OSMD: differs, ignores `<beat-repeat>` and draws the written-out notes

### Checks

1. Do the one- and two-slash beat repeats in measure 1 draw clean diagonal strokes centred in the middle two stave-spaces with no leftover stems or beams?
   Crop: measure 1, 3 above, 2 below
   Book: p. 230, 0.09 0.71 0.79 0.05
2. Does the three-slash beat repeat in measure 2 draw three clean diagonal strokes centred in the middle two stave-spaces with no leftover stems or beams?
   Crop: measure 2, 3 above, 2 below
   Book: p. 230, 0.09 0.71 0.79 0.05
