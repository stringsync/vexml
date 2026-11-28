### The rule

Notate oboe double harmonics with two small open harmonic circles stacked vertically above the chord. See Behind Bars p. 257.

### The test case

`woodwind.musicxml` measure 4 writes two half-note chords where both chord tones carry `<harmonic><sounding-pitch/></harmonic>`.

- Measure 4. Beat 1: A4 + E5 double harmonic. Beat 3: B4 + F#5 double harmonic.

### Renderers

- Behind Bars: agrees, stacks two small open harmonic circles vertically above each double-harmonic chord
- MuseScore: differs, draws only a single harmonic circle above each double-harmonic chord
- Verovio: agrees, stacks two small open harmonic circles vertically above each double-harmonic chord
- OSMD: differs, draws only a single harmonic circle above each double-harmonic chord

### Checks

1. Are two distinct small open harmonic circles stacked vertically above each double-harmonic chord without overlapping?
   Crop: measure 4, 6 above, 2 below
   Book: p. 257, 0.39 0.28 0.22 0.08
