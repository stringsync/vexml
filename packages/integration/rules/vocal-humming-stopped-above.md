### The rule

Place the closed-mouth humming symbol (`+`) above the stave, clear of notes and lyrics below, so it is unmistakable as a vocal technique rather than sung text. See Behind Bars p. 455.

### The test case

`vocal-sounds.musicxml` isolates vocal sound and speech notation rules across measures.

- Measure 1. Four quarter notes (G4, A4, D5, C5) with lyrics on beats 1 and 4 and `<technical><stopped/></technical>` (no `placement` attribute) on beats 2 (up-stem A4) and 3 (down-stem D5).

### Renderers

- Behind Bars: agrees, places the `+` symbol above the stave on all notes
- MuseScore: agrees, places both `+` symbols above the stave clear of notes and lyrics
- Verovio: agrees, places both `+` symbols above the stave clear of notes and lyrics
- OSMD: differs, places the first `+` below the stave on the notehead side of the up-stem note

### Checks

1. Do both `+` closed-mouth symbols sit above the stave, clear of the notes and lyrics below?
   Crop: measure 1, 5 above, 5 below
   Book: p. 455, 0.19 0.62 0.42 0.09
