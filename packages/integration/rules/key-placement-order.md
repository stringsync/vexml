### The rule

Place the key signature at the beginning of every stave to which it applies, after the clef and before the time signature. See Behind Bars p. 91.

### The test case

`keys.musicxml` isolates each key-signature rule by measure.

- Measure 1. Treble clef, 3-sharp key signature, 4/4 time signature, and whole note A4.

### Renderers

- Behind Bars: agrees, states clef, then key signature, then time signature at the start of every stave
- MuseScore: agrees, draws treble clef, 3 sharps, then 4/4 time signature
- Verovio: agrees, draws treble clef, 3 sharps, then 4/4 time signature
- OSMD: agrees, draws treble clef, 3 sharps, then 4/4 time signature

### Checks

1. Does measure 1 place the key signature after the clef and before the time signature?
   Crop: measure 1, 3 above, 3 below
