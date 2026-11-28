### The rule

Draw jazz brass swoops and fall-offs as curved lines leading into the left of a notehead (`scoop` from below, `plop` from above) or trailing off the right of a notehead (`doit` upward, `falloff` downward). See Behind Bars p. 267.

### The test case

`brass.musicxml` measure 3 places `<scoop/>`, `<plop/>`, `<doit/>`, and `<falloff/>` on four consecutive quarter notes (A4, C5, B4, G4).

- Measure 3. Four quarter notes carrying `<scoop/>`, `<plop/>`, `<doit/>`, and `<falloff/>`.

### Renderers

- Behind Bars: agrees, draws curved lead-in lines to the left of the notehead and curved trail-off lines to the right of the notehead
- MuseScore: agrees, draws scoop and plop curves to the left of beats 1 and 2 and doit and falloff curves to the right of beats 3 and 4
- Verovio: differs, omits the scoop, plop, doit, and falloff jazz inflection marks
- OSMD: differs, omits the scoop, plop, doit, and falloff jazz inflection marks

### Checks

1. Do the `scoop` and `plop` curves lead into the left side of beats 1 and 2, and do the `doit` and `falloff` curves trail off the right side of beats 3 and 4?
   Crop: measure 3, 4 above, 3 below
   Book: p. 267, 0.48 0.47 0.34 0.06
