### The rule

Place an open-string zero beside the middle notehead when an interior note of a chord is an open string. See Behind Bars p. 395.

### The test case

`strings-techniques.musicxml` attaches `<open-string/>` to the middle note of three-note chords without explicit `placement`.

- Measure 5. Two three-note half-note chords (G3/D4/B4 and A3/D4/C5) with `<open-string/>` on the middle note D4.

### Renderers

- Behind Bars: agrees, places the open-string zero beside the middle notehead of the chord
- MuseScore: differs, places the open-string circle above the whole chord
- Verovio: differs, places the open-string circle above the whole chord
- OSMD: differs, places the open-string `0` below the whole chord on the notehead side

### Checks

1. Does the open-string mark for the middle note of each three-note chord in measure 5 sit beside the middle notehead rather than above the whole chord?
   Crop: measure 5, 5 above, 4 below
   Book: p. 395, 0.56 0.30 0.28 0.09
