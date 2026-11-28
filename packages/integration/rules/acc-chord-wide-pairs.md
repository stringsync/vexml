### The rule

In a widely spaced chord of four or more notes with overlapping sevenths or wider, align the accidentals in pairs, the most compact arrangement. See Behind Bars p. 89.

### The test case

`accidentals.musicxml` gives each case its own measure.

- Measure 17. C#4, G#4, C#5, G#5 whole-note chord: two overlapping octaves.

### Renderers

- Behind Bars: agrees, accidentals aligned in pairs
- MuseScore: agrees, two columns of octave pairs
- Verovio: agrees, two columns of octave pairs
- OSMD: agrees, two columns of octave pairs

### Checks

1. Do the four sharps form just two columns, each pairing notes an octave apart?
   Crop: measure 17, 5 above, 4 below
   Book: p. 89, 0.20 0.80 0.60 0.05
