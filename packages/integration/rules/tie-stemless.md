### The rule

Curve a tie between stemless notes as if they had stems. The direction then matches the stemmed case. See Behind Bars p. 64.

### The test case

`ties.musicxml` gives each case its own measure.

- Measures 17 and 18 (F4 whole notes) and measures 19 and 20 (D5 whole notes), each tied over the barline.

### Renderers

- Behind Bars: agrees, as if stemmed
- MuseScore: agrees, F4 down and D5 up
- Verovio: agrees, F4 down and D5 up
- OSMD: agrees, F4 down and D5 up

### Checks

1. Does the F4 tie curve down?
   Crop: measure 17, 3 above, 4 below
2. Does the D5 tie curve up?
   Crop: measure 19, 4 above, 3 below
