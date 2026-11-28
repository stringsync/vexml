### The rule

Place a `+` sign above the stave for each left-hand pizzicato note or chord in single-voice writing regardless of stem direction. See Behind Bars p. 412.

### The test case

`strings-pizz-harmonics.musicxml` attaches `<stopped/>` without explicit `placement` in single-voice writing.

- Measure 4. Single-voice quarter notes (up-stem G4, down-stem D5 and E5) and a double-stop chord (A4/E5), each marked with `<stopped/>`.

### Renderers

- Behind Bars: agrees, places the `+` sign above the stave for each left-hand pizzicato note or chord
- MuseScore: agrees, places all four `+` signs above the stave regardless of stem direction
- Verovio: agrees, places all four `+` signs above the stave regardless of stem direction
- OSMD: differs, places `+` on the notehead side (below the stave for the up-stem G4)

### Checks

1. Do all four left-hand pizzicato `+` signs in measure 4 sit above the stave regardless of stem direction?
   Crop: measure 4, 5 above, 2 below
   Book: p. 412, 0.46 0.75 0.41 0.11
