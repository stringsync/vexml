### The rule

Stack right-hand fingering letters vertically for a chord in pitch order without colliding with the notes or each other. See Behind Bars p. 375.

### The test case

`guitar-fingering.musicxml` isolates chord right-hand fingering in measure 5.

- Measure 5. Two three-note half-note chords (written `E4-B4-E5` with `p`, `i`, `m` and `A3-E4-C5` with `p`, `i`, `a`), unmarked placement.

### Renderers

- Behind Bars: agrees, stacks right-hand fingering letters cleanly in pitch order without overlap
- MuseScore: agrees, stacks italic right-hand fingering letters vertically above each chord in top-to-bottom pitch order
- Verovio: differs, omits `<pluck>` markings
- OSMD: differs, omits `<pluck>` markings

### Checks

1. Do the right-hand fingering letters stack cleanly in pitch order on each chord in measure 5 with no collisions?
   Crop: measure 5, 10 above, 4 below
   Book: p. 375, 0.25 0.21 0.24 0.08
