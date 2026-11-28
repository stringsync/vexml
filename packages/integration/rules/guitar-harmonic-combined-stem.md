### The rule

Combine a natural harmonic diamond notehead with an ordinary stopped notehead on a single shared stem when both sound together. See Behind Bars p. 388.

### The test case

`guitar-harmonics-scordatura.musicxml` isolates combined natural harmonic and stopped chords in measure 5.

- Measure 5. Two half-note chords (`A3` stopped + `E5` natural harmonic; `E4` stopped + `B4` natural harmonic) sharing a single stem.

### Renderers

- Behind Bars: agrees, draws the natural harmonic as a diamond and the stopped note as a normal notehead on the shared stem
- MuseScore: differs, draws two ordinary oval noteheads with a small circle above the chord
- Verovio: differs, draws two ordinary oval noteheads with a small circle above the chord
- OSMD: differs, draws two ordinary oval noteheads with a small circle below the chord

### Checks

1. Does each chord in measure 5 combine an ordinary stopped notehead with a diamond harmonic notehead on one shared stem?
   Crop: measure 5, 4 above, 4 below
   Book: p. 388, 0.15 0.66 0.25 0.08
