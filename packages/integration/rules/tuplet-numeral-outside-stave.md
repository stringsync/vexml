### The rule

Place tuplet numerals wholly or partially outside the stave so stave lines do not obscure them, never completely inside the stave. See Behind Bars p. 194.

### The test case

`tuplets-numeral.musicxml` places beamed triplets whose beams sit near the opposite edge of the stave.

- Measure 4. Beat 1: high down-stem beamed 3:2 eighth triplet (C6, B5, C6). Beat 2: low up-stem beamed 3:2 eighth triplet (A3, B3, A3).

### Renderers

- Behind Bars: agrees, places the numeral wholly or partially outside the stave rather than completely within the stave lines
- MuseScore: agrees, places both numerals wholly outside the stave
- Verovio: agrees, places both numerals partially outside the outer stave lines
- OSMD: agrees, places both numerals outside the stave (moving the high triplet numeral above the stave)

### Checks

1. In measure 4, does each triplet numeral sit wholly or partially outside the stave rather than completely inside the stave lines?
   Crop: measure 4, 4 above, 4 below
   Book: p. 194, 0.14 0.36 0.21 0.06
