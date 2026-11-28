### The rule

Align a bar-length note with the first beat if another part plays shorter values in the same bar. (Behind Bars p. 41)

### The test case

`barline-score.musicxml` uses a whole note in the upper part and four quarters in the lower part.

### Renderers

- Behind Bars: agrees, aligns the held note with the other part's first beat
- MuseScore: agrees, the flute's whole note sits over the clarinet's first quarter (its strip tile clips the lower stave, so read off the full render)
- Verovio: agrees, the whole note sits over the first quarter
- OSMD: agrees, the whole note sits over the first quarter

### Checks

1. Does the upper whole note align with the first quarter below?
   Crop: measure 2, 7 spaces, 1 above, 10 below
