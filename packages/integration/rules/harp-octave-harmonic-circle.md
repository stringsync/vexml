### The rule

Draw a harp octave harmonic as a normal notehead at the plucked pitch with a small circle (`○`) placed above each harmonic note. See Behind Bars p. 366.

### The test case

`harp-marks.musicxml` uses a single-staff treble harp part.

- Measure 4. Half note `G4`, quarter note `C5`, and quarter-note chord `E4/G4`, each marked `<harmonic><sounding-pitch/></harmonic>` with placement unspecified.

### Renderers

- Behind Bars: agrees, draws a normal notehead with a small circle above each harmonic note and stacks circles above harmonic chords
- MuseScore: agrees, draws a normal notehead with a small circle above each harmonic note
- Verovio: agrees, draws a normal notehead with a small circle above each harmonic note and stacks two circles above the two-note chord
- OSMD: differs, places the harmonic circle below up-stem notes on the notehead side

### Checks

1. In measure 4, does each octave harmonic draw a normal notehead with a small circle placed above it?
   Crop: measure 4, 6 above, 4 below
   Book: p. 366, 0.14 0.45 0.72 0.10
