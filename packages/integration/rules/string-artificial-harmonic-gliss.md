### The rule

In an artificial harmonic glissando, draw glissando lines between both the fundamental noteheads and the diamond harmonic noteheads to show that the hand slides along the fingerboard maintaining the interval. See Behind Bars p. 424.

### The test case

`strings-ensembles.musicxml` isolates an artificial harmonic double glissando in measure 1.

- Measure 1. Two half-note artificial-harmonic chords (G4 with C5 diamond notehead sliding to B4 with E5 diamond notehead), with separate glissando spanners between the fundamental and harmonic pairs.

### Renderers

- Behind Bars: agrees, draws parallel glissando lines between both the fundamental and diamond harmonic noteheads
- MuseScore: agrees, draws parallel glissando lines between both the fundamental and diamond noteheads
- Verovio: agrees, draws parallel straight glissando lines between both the fundamental and diamond noteheads
- OSMD: agrees, draws parallel straight glissando lines between both the fundamental and diamond noteheads

### Checks

1. Do parallel glissando lines connect both the fundamental noteheads and the diamond harmonic noteheads in measure 1?
   Crop: measure 1, 3 above, 2 below
   Book: p. 424, 0.220 0.345 0.560 0.095
