### The rule

Keep a hairpin's open end the same width whatever dynamics it joins: the opening does not show how big the change is. See Behind Bars p. 103.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 6. A crescendo from `pp` to `ff`.
- Measure 7. A crescendo of the same length from `p` to `mf`.

### Renderers

- Behind Bars: agrees, opens every hairpin the same width
- MuseScore: agrees, opens both hairpins the same width
- Verovio: agrees, opens both hairpins the same width
- OSMD: agrees, opens both hairpins the same width

### Checks

1. Are the open ends of the hairpins in measures 6 and 7 the same width?
   Crop: measure 6, 2 above, 6 below
   Book: p. 103, 0.33 0.845 0.34 0.025

2. Does the hairpin in measure 7 open as wide as the one in measure 6?
   Crop: measure 7, 2 above, 6 below
   Book: p. 103, 0.33 0.845 0.34 0.025
