### The rule

When one of two unison voices is dotted and tied, the dotted head may go to the right so that the heads can close up, with each voice’s tie curving in its own direction. See Behind Bars p. 70.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 15. Voice 1 ties A4 half to A4 half; voice 2 ties dotted half A4 to quarter A4.

### Renderers

- Behind Bars: agrees, heads close up with upper tie up and lower tie down
- MuseScore: agrees, touching heads with dot after both, upper tie up and lower tie down
- Verovio: agrees, touching heads with dot after both, upper tie up and lower tie down
- OSMD: differs, merges into one shared notehead with dot after it, upper tie up and lower tie down

### Why a person decides

Gould gives two layouts with “or”, and the 2026-11-26 `dot-unison-one-voice` decision already sets touching unison heads with dots after both heads.

### Checks

1. Do the two voices keep their upper-up / lower-down ties cleanly clear of the dot?
   Crop: measure 15, 4 above, 4 below
