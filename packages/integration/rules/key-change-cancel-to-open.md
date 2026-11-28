### The rule

When a key change moves to an open key (no sharps or flats), cancel the previous key signature with natural signs in the order of the cancelled key after the barline, in both traditional and contemporary practice. See Behind Bars pp. 92–93.

### The test case

`keys.musicxml` isolates each key-signature rule by measure.

- Measure 3. Change from 4 sharps (F#, C#, G#, D#) to C major (0 fifths) with no explicit `<cancel>` element.

### Renderers

- Behind Bars: agrees, cancels the previous key with naturals in order after the barline when moving to no key signature
- MuseScore: agrees, draws four cancelling naturals (F, C, G, D) in order after the barline
- Verovio: agrees, draws four cancelling naturals (F, C, G, D) in order after the barline
- OSMD: agrees, draws four cancelling naturals (F, C, G, D) in order after the barline

### Checks

1. Does measure 3 show four cancelling naturals (F, C, G, D) in order after the barline?
   Crop: measure 3, 3 above, 3 below
   Book: p. 93, 0.19 0.27 0.62 0.13
