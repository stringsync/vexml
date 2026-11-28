### The rule

Position a mid-phrase fermata inside its slur, with the slur arching cleanly over the fermata without colliding with it. See Behind Bars p. 189.

### The test case

`pauses.musicxml` puts a mid-phrase fermata on the middle note of a three-note slurred group in measure 7.

- Measure 7. Down-stem D5, F5, and E5 under one above-stave slur, with `<fermata>normal</fermata>` on F5.

### Renderers

- Behind Bars: agrees, positions the mid-phrase fermata inside the slur arc with clear separation
- MuseScore: differs, places the fermata outside (above) the slur arc
- Verovio: differs, places the fermata outside (above) the slur arc
- OSMD: agrees, arches the slur cleanly over the fermata so it sits inside the slur

### Checks

1. Does the fermata on F5 sit cleanly inside the slur arc without colliding with it?
   Crop: measure 7, 5 above, 2 below
