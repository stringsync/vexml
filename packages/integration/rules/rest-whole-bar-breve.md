### The rule

A semibreve rest represents a whole-bar rest in metres shorter than 4/2 or 8/4, whereas time signatures of 4/2 or 8/4 and larger use a breve rest as the whole-bar rest. See Behind Bars p. 160.

### The test case

`metre-whole-rests.musicxml` measures 4–8 each contain `<rest measure="yes"/>` with no explicit `<type>` across five metres.

- Measures 4–6. 3/16, 9/8, and 3/2 (should draw semibreve rests).
- Measures 7–8. 4/2 and 5/2 (should draw breve rests).

### Renderers

- Behind Bars: agrees, uses a hanging semibreve rest in 3/16, 9/8 and 3/2 and a breve rest filling the third space in 4/2 and 5/2
- MuseScore: agrees, draws a semibreve rest in 3/2 and a breve rest in 4/2 and 5/2
- Verovio: agrees, draws a semibreve rest in 3/2 and a breve rest in 4/2 and 5/2
- OSMD: differs, draws a semibreve rest in 4/2 and 5/2 instead of a breve rest

### Checks

1. Do measures 4–6 (3/16, 9/8, 3/2) draw a hanging semibreve rest?
   Crop: measure 6, 2 above, 2 below
   Book: p. 160, 0.24 0.30 0.52 0.04

2. Do measures 7–8 (4/2 and 5/2) draw a breve rest filling the space between lines 3 and 4 rather than a semibreve rest?
   Crop: measure 7, 2 above, 2 below
   Book: p. 160, 0.24 0.30 0.52 0.04
