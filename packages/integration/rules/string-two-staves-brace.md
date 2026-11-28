### The rule

Join two staves belonging to a single stringed instrument with a curly brace rather than a square bracket. See Behind Bars p. 401.

### The test case

`strings-two-staves.musicxml` defines one cello part with `<staves>2</staves>` (treble and bass clefs) and no explicit `<part-symbol>`.

- Measure 1. A single two-stave cello part with half notes on both staves.

### Renderers

- Behind Bars: agrees, joins the two staves of one instrument with a curly brace
- MuseScore: agrees, joins the two staves with a curly brace
- Verovio: agrees, joins the two staves with a curly brace
- OSMD: agrees, joins the two staves with a curly brace

### Checks

1. Are the two staves of the single cello part in measure 1 joined at the left edge by a curly brace rather than a square bracket?
   Crop: measure 1, staff 1, 2 above, 12 below
   Book: p. 401, 0.20 0.09 0.60 0.12
