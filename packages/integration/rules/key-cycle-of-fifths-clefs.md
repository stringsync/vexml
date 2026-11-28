### The rule

Arrange key-signature accidentals in cycle-of-fifths order in every clef, using the identical pattern across treble, alto and bass clefs and the ascending bottom-space pattern for sharps in tenor clef. See Behind Bars p. 91.

### The test case

`keys-clefs.musicxml` uses four staves (treble, alto, tenor, bass).

- Measure 1. Seven sharps in treble, alto, tenor and bass clefs.
- Measure 3. Seven flats in treble, alto, tenor and bass clefs.

### Renderers

- Behind Bars: agrees, shows cycle-of-fifths patterns in all four clefs including ascending tenor-clef sharps
- MuseScore: agrees, uses the ascending bottom-space pattern for tenor sharps and standard cycle-of-fifths layouts in all clefs
- Verovio: agrees, uses the ascending bottom-space pattern for tenor sharps and standard cycle-of-fifths layouts in all clefs
- OSMD: agrees, uses the ascending bottom-space pattern for tenor sharps and standard cycle-of-fifths layouts in all clefs

### Checks

1. In measure 1 (tenor clef, staff 3), do the seven sharps start on the bottom space (F3) and climb upward in the tenor-clef pattern?
   Crop: measure 1, staff 3, 3 above, 3 below
   Book: p. 91, 0.52 0.77 0.19 0.06

2. In measure 3 (treble, staff 1), do the seven flats follow the standard descending-fourth/ascending-fifth cycle-of-fifths layout?
   Crop: measure 3, staff 1, 3 above, 3 below
   Book: p. 91, 0.13 0.83 0.19 0.06
