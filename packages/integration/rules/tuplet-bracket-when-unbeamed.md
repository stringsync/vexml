### The rule

Use a bracket to enclose unbeamed tuplets, partially beamed tuplets, tuplets containing rests (enclosing all values including rests), and any tuplet whose numeral sits on the notehead side. See Behind Bars p. 199.

### The test case

`tuplets-placement.musicxml` leaves the `bracket` attribute unset on an unbeamed triplet ending with a rest.

- Measure 8. Unbeamed 3:2 quarter triplet (G4 quarter, A4 quarter, quarter rest) with no explicit `bracket` attribute.

### Renderers

- Behind Bars: agrees, draws a bracket enclosing both notes and the trailing rest
- MuseScore: agrees, draws a bracket enclosing both notes and the trailing rest
- Verovio: agrees, draws a bracket enclosing both notes and the trailing rest
- OSMD: agrees, draws a bracket enclosing both notes and the trailing rest

### Checks

1. In measure 8, is a bracket drawn enclosing the two quarter notes and the trailing quarter rest?
   Crop: measure 8, 3 above, 2 below
   Book: p. 199, 0.31 0.56 0.38 0.06
