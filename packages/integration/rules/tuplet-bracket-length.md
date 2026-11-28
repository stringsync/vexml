### The rule

Extend a tuplet bracket from the left edge of the first notehead or rest to the right edge of the final notehead or rest, excluding preceding accidentals, grace notes or arpeggios, and stopping at the right edge of an up-stemmed flagged final note rather than past its flag. See Behind Bars p. 195.

### The test case

`tuplets-bracket.musicxml` tests bracket start and end edges.

- Measure 1. Unbeamed 3:2 quarter triplet starting on F♯4 (preceding sharp accidental), followed by G4 and A4.
- Measure 2. Unbeamed 3:2 eighth triplet (eighth rest, E4 eighth, F4 up-stemmed flagged eighth) followed by a quarter rest.

### Renderers

- Behind Bars: agrees, starts the bracket at the first notehead (excluding the sharp) and stops at the right edge of the up-stemmed flagged final note
- MuseScore: agrees, starts the bracket at the F♯4 notehead (excluding the sharp) and ends at the right edge of the final up-stemmed eighth note
- Verovio: agrees, starts the bracket at the F♯4 notehead (excluding the sharp) and ends at the right edge of the final up-stemmed eighth note
- OSMD: agrees, starts the bracket at the F♯4 notehead (excluding the sharp) and ends at the right edge of the final up-stemmed eighth note

### Checks

1. In measure 1, does the bracket start at the left edge of the F♯4 notehead rather than encompassing the sharp accidental?
   Crop: measure 1, 3 above, 2 below
   Book: p. 195, 0.13 0.23 0.28 0.07
2. In measure 2, does the bracket span from the opening rest to the right edge of the final up-stemmed eighth note?
   Crop: measure 2, 3 above, 2 below
   Book: p. 195, 0.41 0.23 0.13 0.07
