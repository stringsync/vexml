### The rule

Enclose the tuplet numeral in a square bracket rather than a curved arc, broken for the numeral and centred vertically on it. See Behind Bars p. 194.

### The test case

`tuplets-numeral.musicxml` places an unbeamed quarter-note triplet in measure 5 with no explicit bracket attributes.

- Measure 5. Unbeamed 3:2 quarter-note triplet (G4, A4, B4) in 2/4.

### Renderers

- Behind Bars: agrees, draws a square bracket broken and vertically centred on the numeral
- MuseScore: agrees, draws a square bracket broken and vertically centred on the `3`
- Verovio: agrees, draws a square bracket broken and vertically centred on the `3`
- OSMD: agrees, draws a square bracket broken and vertically centred on the `3`

### Checks

1. In measure 5, is the triplet enclosed in a square bracket (not a curved arc) broken and centred vertically on the `3`?
   Crop: measure 5, 3 above, 3 below
   Book: p. 194, 0.29 0.58 0.20 0.06
