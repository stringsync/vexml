### The rule

Join the two staves of a keyboard part with a curly brace at the left of each system so the player reads them as one braced part. See Behind Bars p. 303.

### The test case

`keyboard-system.musicxml` gives each keyboard system rule its own measure(s).

- Measure 1. A two-stave piano part in 4/4 with treble clef on stave 1 and bass clef on stave 2, playing quarter notes in both staves, with no explicit `<part-symbol>` override.

### Renderers

- Behind Bars: agrees, draws a curly brace spanning from the top line of the upper stave to the bottom line of the lower stave
- MuseScore: agrees, draws a curly brace joining the two staves at the left of the system
- Verovio: agrees, draws a curly brace joining the two staves at the left of the system
- OSMD: agrees, draws a curly brace joining the two staves at the left of the system

### Checks

1. Does a curly brace at the left of the system connect the top line of the upper stave to the bottom line of the lower stave?
   Crop: measure 1, 2 above, 15 below
   Book: p. 303, 0.15 0.56 0.32 0.11
