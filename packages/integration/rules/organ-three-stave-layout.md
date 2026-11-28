### The rule

Write organ music with pedals on three staves: brace the two manual staves together with joined barlines, exclude the pedal stave from the brace, and give the pedal stave separate barlines while joining all three staves with the systemic left barline. See Behind Bars pp. 342–343.

### The test case

`organ-three-stave.musicxml` defines Part 1 (`Man.`, `<staves>2</staves>`, `<part-symbol>brace</part-symbol>`) and Part 2 (`Ped.`, 1 stave) with no `<part-group>` joining their barlines.

- Measure 1–2. A curly brace and internal barlines join the two manual staves; the pedal stave sits unbraced below with its own separate barlines, and the systemic left barline joins all three staves.

### Renderers

- Behind Bars: agrees, manual staves are braced with joined barlines, pedal stave is unbraced with separate barlines, and the left systemic barline spans all three staves
- MuseScore: agrees, braces the two manual staves with joined barlines, excludes the pedal stave with separate barlines, and joins all three staves with the left systemic barline
- Verovio: agrees, braces the two manual staves with joined barlines, excludes the pedal stave with separate barlines, and joins all three staves with the left systemic barline
- OSMD: agrees, braces the two manual staves with joined barlines, excludes the pedal stave with separate barlines, and joins all three staves with the left systemic barline

### Checks

1. Are the two manual staves braced with joined barlines while the pedal stave is unbraced with separate barlines and a continuous left systemic barline spans all three staves?
   Crop: measure 1, part 1, 2 above, 18 below
   Book: p. 343, 0.28 0.40 0.24 0.16
