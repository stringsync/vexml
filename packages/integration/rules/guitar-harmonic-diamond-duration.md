### The rule

Draw natural harmonic diamond noteheads open for half and whole notes and filled for quarter notes and shorter values. See Behind Bars p. 384.

### The test case

`guitar-harmonics-scordatura.musicxml` isolates natural harmonic diamond fill by duration in measure 2.

- Measure 2. Natural harmonics (`<harmonic><natural/></harmonic>`) on `E5` and `B4`: one half note, one quarter note, and two beamed eighth notes.

### Renderers

- Behind Bars: agrees, draws an open diamond for the half note and filled black diamonds for the quarter and eighth notes
- MuseScore: differs, draws ordinary oval noteheads with small circles above
- Verovio: differs, draws ordinary oval noteheads with small circles above
- OSMD: differs, draws ordinary oval noteheads with small circles above

### Checks

1. In measure 2, is the half-note harmonic an open diamond while the quarter and eighth harmonics are filled black diamonds?
   Crop: measure 2, 4 above, 3 below
   Book: p. 386, 0.45 0.70 0.17 0.07
