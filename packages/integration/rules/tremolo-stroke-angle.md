### The rule

Slant single-note tremolo strokes diagonally upward from bottom-left to top-right regardless of stem direction or beam angle. (Gould notes as acceptable that some editions set beamed-group strokes parallel to the beam at beam thickness.) See Behind Bars p. 223.

### The test case

`tremolos.musicxml` gives each case its own measure.

- Measure 10. A beamed ascending pair (F4 to B4), a beamed descending pair (E5 to A4), and unbeamed quarter notes G4 and D5, all with two tremolo strokes.

### Renderers

- Behind Bars: agrees, slants every tremolo stroke upward from bottom-left to top-right regardless of stem or beam angle
- MuseScore: agrees, slants every tremolo stroke upward from bottom-left to top-right
- Verovio: agrees, slants every tremolo stroke upward from bottom-left to top-right
- OSMD: agrees, slants every tremolo stroke upward from bottom-left to top-right

### Checks

1. Do all tremolo strokes slant diagonally upward from bottom-left to top-right across ascending beams, descending beams, up-stems and down-stems?
   Crop: measure 10, 3 above, 3 below
   Book: p. 223, 0.28 0.18 0.44 0.07
