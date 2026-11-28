### The rule

An instrument on two or more staves (or parts in a polytonal ensemble) may carry an independent key signature on each stave. See Behind Bars pp. 93–94.

### The test case

`keys-staves.musicxml` uses a two-stave grand staff.

- Measure 1. Staff 1 (treble) has 2 sharps (`<key number="1"><fifths>2</fifths></key>`); staff 2 (bass) has 3 flats (`<key number="2"><fifths>-3</fifths></key>`).

### Renderers

- Behind Bars: agrees, states each stave of a multi-stave instrument may carry its own key signature
- MuseScore: agrees, draws 2 sharps on staff 1 and 3 flats on staff 2
- Verovio: agrees, draws 2 sharps on staff 1 and 3 flats on staff 2
- OSMD: agrees, draws 2 sharps on staff 1 and 3 flats on staff 2

### Checks

1. Does staff 1 display 2 sharps in treble clef?
   Crop: measure 1, staff 1, 3 above, 3 below

2. Does staff 2 simultaneously display 3 flats in bass clef?
   Crop: measure 1, staff 2, 3 above, 3 below
