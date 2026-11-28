### The rule

Clarify a tempo equation placed after a barline with left and right arrows showing which note-value belongs to which tempo. See Behind Bars p. 186.

### The test case

`tempo-equations-complex.musicxml` encodes `<metronome-arrows/>` on `dotted-quarter = half` in measure 1.

- Measure 1. Tempo equation `<- dotted-quarter = half ->`.

### Renderers

- Behind Bars: agrees, draws outward-pointing arrows on both sides of the tempo equation
- MuseScore: unavailable, hangs on `<metronome-arrows/>`
- Verovio: differs, omits the `<metronome-note>` equation
- OSMD: differs, draws `dotted-quarter = half` without the outward arrows

### Checks

1. Does measure 1 draw outward left and right arrows flanking `dotted-quarter = half`?
   Crop: measure 1, 6 above, 2 below
