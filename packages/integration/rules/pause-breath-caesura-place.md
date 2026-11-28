### The rule

Place a breath comma and caesura just before the next note or barline, with the caesura's diagonal strokes starting on the second stave-line down and extending upwards to the position of the first ledger line above the stave. See Behind Bars p. 187.

### The test case

`pauses.musicxml` places a breath comma after beat 1 and a caesura after beat 3 in measure 1.

- Measure 1. Half-note G4 with `<breath-mark/>` followed by half-note A4 with `<caesura/>`.

### Renderers

- Behind Bars: agrees, places the breath comma just before A4 and the caesura just before the barline, straddling the upper stave lines
- MuseScore: agrees, places the breath comma just before A4 and the caesura just before the barline, straddling the top two lines
- Verovio: agrees, places the breath comma just before A4 and the caesura at the barline, straddling the top two lines
- OSMD: differs, places the breath comma just before A4 but omits the caesura

### Checks

1. Do the breath comma and caesura sit just before the next note and the barline respectively, with the caesura straddling the top of the stave?
   Crop: measure 1, 5 above, 2 below
