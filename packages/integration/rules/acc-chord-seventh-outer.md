### The rule

In a chord spanning a seventh or more, align the outer notes' accidentals nearest the chord, then offset the rest leftwards starting with the highest remaining and alternating. See Behind Bars p. 89.

### The test case

`accidentals.musicxml` gives each case its own measure.

- Measure 16. E♭4, G♭4, B♭4, D♭5 whole-note chord.

### Renderers

- Behind Bars: agrees, outer signs aligned nearest, then alternating
- MuseScore: agrees, E♭4 and D♭5 aligned nearest, then B♭4, then G♭4
- Verovio: agrees, E♭4 and D♭5 aligned nearest, then B♭4, then G♭4
- OSMD: agrees, E♭4 and D♭5 aligned nearest, then B♭4, then G♭4

### Checks

1. Do E♭4's and D♭5's flats line up nearest the heads, with B♭4's next and G♭4's furthest left?
   Crop: measure 16, 4 above, 3 below
   Book: p. 89, 0.37 0.60 0.26 0.07
