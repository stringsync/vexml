### The rule

When a tuplet ends with its longest duration, extend the bracket to the hypothetical final division so the numeral sits at the rhythmic centre (or traditionally stop at the last written notehead). See Behind Bars p. 195.

### Why a person decides

Behind Bars describes both the traditional convention (ending the bracket at the last written notehead) and the modern convention (extending the bracket to the hypothetical final division to centre the numeral rhythmically).

### The test case

`tuplets-bracket.musicxml` places a quarter + half triplet in measure 3.

- Measure 3. Unbeamed 3:2 quarter triplet consisting of G4 quarter + A4 half in 2/4.

### Renderers

- Behind Bars: agrees, shows the modern extended bracket to the hypothetical final division (while noting the traditional stop at the last written notehead)
- MuseScore: differs, stops the bracket at the right edge of the half notehead (traditional)
- Verovio: differs, stops the bracket at the right edge of the half notehead (traditional)
- OSMD: differs, stops the bracket at the right edge of the half notehead (traditional)

### Checks

1. In measure 3, does the bracket over the quarter + half triplet stop at the half notehead or extend toward the hypothetical final division?
   Crop: measure 3, 3 above, 2 below
   Book: p. 195, 0.36 0.58 0.29 0.08
