### The rule

An unconventional key signature may select any arbitrary combination of sharps or flats to alter those pitches across all octaves. See Behind Bars p. 94.

### The test case

`keys.musicxml` isolates each key-signature rule by measure.

- Measure 11. Non-traditional key signature specifying F# and B♭ (`<key-step>`/`<key-alter>`) in treble clef.

### Renderers

- Behind Bars: agrees, draws arbitrary sharp/flat combinations as a key signature
- MuseScore: agrees, draws F# and Bb as the unconventional key signature
- Verovio: agrees, draws F# and Bb as the unconventional key signature
- OSMD: differs, omits the unconventional key signature and places accidentals on the notes instead

### Checks

1. Does measure 11 render both F# and B♭ in its unconventional key signature?
   Crop: measure 11, 3 above, 3 below
   Book: p. 94, 0.26 0.25 0.48 0.055
