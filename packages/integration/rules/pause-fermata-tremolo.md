### The rule

Centre a fermata outside the beams of a two-note tremolo. See Behind Bars p. 188.

### The test case

`pauses.musicxml` puts a two-note tremolo between A4 and C5 with a fermata in measure 5.

- Measure 5. Half-note A4 to C5 two-note tremolo (`<tremolo type="start">2</tremolo>` to `stop`) carrying `<fermata>normal</fermata>`.

### Renderers

- Behind Bars: agrees, centres the fermata above the tremolo beams between the two notes
- MuseScore: differs, places the fermata over the first notehead (A4) rather than centred over the tremolo beams
- Verovio: differs, places the fermata over the first notehead (A4) rather than centred over the tremolo beams
- OSMD: differs, places the fermata over the first notehead (A4) rather than centred over the tremolo beams

### Checks

1. Is the fermata in measure 5 centred over the two-note tremolo rather than sitting over the first notehead alone?
   Crop: measure 5, 5 above, 2 below
