### The rule

When a single-stave manual part is paired with a pedal stave, give the single manual stave a compressed curly brace and leave the pedal stave unbraced to distinguish them. See Behind Bars p. 343.

### The test case

`organ-single-manual.musicxml` wraps Part 1 (`Man.`, 1 stave) in a `<part-group>` with `<group-symbol>brace</group-symbol>` and `<group-barline>no</group-barline>`, followed by Part 2 (`Ped.`, 1 stave).

- Measure 1–2. The upper single manual stave carries a compressed curly brace; the lower pedal stave has no brace.

### Renderers

- Behind Bars: agrees, draws a compressed curly brace on the single manual stave and leaves the pedal stave unbraced
- MuseScore: agrees, draws a compressed curly brace on the single manual stave while leaving the pedal stave unbraced
- Verovio: agrees, draws a compressed curly brace on the single manual stave while leaving the pedal stave unbraced
- OSMD: differs, omits the curly brace on the single manual stave

### Checks

1. Does the single manual stave carry a compressed curly brace while the pedal stave remains unbraced?
   Crop: measure 1, part 1, 2 above, 12 below
   Book: p. 343, 0.34 0.70 0.30 0.08
