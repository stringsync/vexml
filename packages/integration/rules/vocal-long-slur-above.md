### The rule

Place long syllabic slurs (and vocal phrase marks) above the stave so they remain clear of the sung text below. See Behind Bars p. 436.

### The test case

`vocal-slurs-breathing.musicxml` places a long eight-note syllabic slur without explicit `placement` in measure 3.

- Measure 3. Eight beamed up-stem eighth notes (E4, F4, G4, A4, G4, F4, E4, D4) sung to a single extended syllable under one slur.

### Renderers

- Behind Bars: agrees, places long syllabic slurs above the stave clear of the sung text
- MuseScore: differs, places the long syllabic slur below the up-stem noteheads between the stave and lyrics
- Verovio: differs, places the long syllabic slur below the up-stem noteheads between the stave and lyrics
- OSMD: agrees, places the long syllabic slur above the stems and stave clear of the lyrics

### Checks

1. Does the long syllabic slur in measure 3 sit above the stave, clear of the sung text and extender below?
   Crop: measure 3, 6 above, 7 below
   Book: p. 435, 0.335 0.695 0.330 0.085
