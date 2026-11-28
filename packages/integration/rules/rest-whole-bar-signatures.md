### The rule

When a bar containing a whole-bar rest also holds an opening clef, key signature, time signature, or a trailing courtesy clef, place the rest at the centre of the remaining blank space. See Behind Bars p. 160.

### The test case

`metre-whole-rests.musicxml` measures 1 and 2 test whole-bar rest centring with signatures at the start and a courtesy clef at the end.

- Measure 1. Treble clef, three flats, 3/4 time signature, and a whole-bar rest.
- Measure 2. Whole-bar rest followed by a trailing courtesy bass clef before the barline into measure 3.

### Renderers

- Behind Bars: agrees, centres the whole-bar rest in the blank space after opening signatures and before a trailing courtesy clef
- MuseScore: agrees, centres the whole-bar rest in the remaining blank space in both measures 1 and 2
- Verovio: agrees, centres the whole-bar rest in the remaining blank space in both measures 1 and 2
- OSMD: differs, merges measures 1 and 2 into a two-bar multimeasure rest

### Checks

1. In measure 1, is the whole-bar rest centred in the blank space between the 3/4 time signature and the closing barline?
   Crop: measure 1, 2 above, 2 below
   Book: p. 160, 0.36 0.16 0.28 0.06

2. In measure 2, is the whole-bar rest centred in the blank space between the opening barline and the trailing courtesy bass clef?
   Crop: measure 2, 2 above, 2 below
   Book: p. 160, 0.36 0.16 0.28 0.06
