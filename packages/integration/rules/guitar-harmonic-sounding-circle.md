### The rule

When natural harmonics use an ordinary notehead with a small circle above, draw a normal notehead with the circle clearly above the note and stave. See Behind Bars p. 385.

### The test case

`guitar-harmonics-scordatura.musicxml` isolates circle-style natural harmonics in measure 3.

- Measure 3. Four quarter notes (`E4`, `B4`, `E5`, `G5`) carrying `<harmonic><natural/><sounding-pitch/></harmonic>`.

### Renderers

- Behind Bars: agrees, draws ordinary noteheads with a small circle cleanly above each note
- MuseScore: agrees, draws ordinary noteheads with a small circle cleanly above each note
- Verovio: agrees, draws ordinary noteheads with a small circle cleanly above each note
- OSMD: differs, places the circle below the low `E4` notehead instead of above

### Checks

1. Do the four notes in measure 3 draw ordinary noteheads with a small harmonic circle clearly above each note and stave?
   Crop: measure 3, 5 above, 3 below
   Book: p. 385, 0.25 0.13 0.25 0.07
