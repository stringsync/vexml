### The rule

On a braced two-stave part, place a default single fermata on the lower stave upright above that stave rather than inverted below it. See Behind Bars p. 189.

### The test case

`pauses-braced.musicxml` is a two-stave grand staff where both staves carry a single voice with a default `<fermata>normal</fermata>` (no `type` attribute).

- Measure 1. Staff 1 (treble) half note E4 with fermata; staff 2 (bass) half note G3 with fermata.

### Renderers

- Behind Bars: agrees, places the lower stave's fermata upright above the lower stave (noting below-stave as a traditional alternative)
- MuseScore: agrees, places the lower stave's fermata upright above the lower stave
- Verovio: agrees, places the lower stave's fermata upright above the lower stave
- OSMD: agrees, places the lower stave's fermata upright above the lower stave

### Checks

1. Does the lower stave's fermata sit upright above the lower stave?
   Crop: measure 1, staff 2, 5 above, 3 below
