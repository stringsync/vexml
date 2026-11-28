### The rule

Join all staves of a three- or four-stave solo piano system with a single curly brace and continuous barlines spanning the entire system. See Behind Bars pp. 331–332.

### The test case

`keyboard-three-stave.musicxml` defines a single solo piano part with `<staves>3</staves>` and `<part-symbol>brace</part-symbol>`.

- Measure 1–2. Three staves (treble, treble, bass) joined by one full-height curly brace on the left and unbroken barlines running through all three staves.

### Renderers

- Behind Bars: agrees, one curly brace and continuous barlines join all three staves
- MuseScore: agrees, joins all three staves with a single curly brace and continuous barlines
- Verovio: agrees, joins all three staves with a single curly brace and continuous barlines
- OSMD: agrees, joins all three staves with a single curly brace and continuous barlines

### Checks

1. Do a single curly brace and continuous barlines join all three staves of the solo piano system?
   Crop: measure 1, part 1, 2 above, 18 below
   Book: p. 331, 0.12 0.70 0.20 0.17
