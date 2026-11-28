### The rule

Notate natural harmonics written at sounding pitch with a small circle above the note in single-voice writing, distinct from the open-string zero. See Behind Bars p. 414.

### The test case

`strings-pizz-harmonics.musicxml` attaches `<harmonic><natural/><sounding-pitch/></harmonic>` without explicit `placement`.

- Measure 6. Single-voice quarter notes (G4, D5, A5, E5), each marked as a sounding-pitch natural harmonic.

### Renderers

- Behind Bars: agrees, draws a small circle above each sounding-pitch natural harmonic note
- MuseScore: agrees, draws a small circle above all four notes
- Verovio: agrees, draws a small circle above all four notes
- OSMD: differs, draws a `0` on the notehead side (below the stave for the up-stem G4)

### Checks

1. Do all four natural harmonics in measure 6 keep ordinary noteheads with a small harmonic circle placed above the stave and note?
   Crop: measure 6, 5 above, 2 below
   Book: p. 414, 0.31 0.56 0.38 0.08
