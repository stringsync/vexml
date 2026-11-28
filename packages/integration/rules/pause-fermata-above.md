### The rule

Always place a fermata upright above the stave in single-stemmed writing regardless of stem direction. See Behind Bars p. 188.

### The test case

`pauses.musicxml` tests both low up-stem and high down-stem single-voiced notes with default `<fermata>normal</fermata>` (no `type` attribute).

- Measure 4. Up-stem half note E4 and down-stem half note G5, each with `<fermata>normal</fermata>`.

### Renderers

- Behind Bars: agrees, places both fermatas upright above the stave regardless of stem direction
- MuseScore: agrees, places both fermatas upright above the stave
- Verovio: agrees, places both fermatas upright above the stave
- OSMD: agrees, places both fermatas upright above the stave

### Checks

1. Are both fermatas in measure 4 placed upright above the stave?
   Crop: measure 4, 5 above, 2 below
