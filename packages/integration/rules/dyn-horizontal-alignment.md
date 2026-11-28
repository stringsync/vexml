### The rule

Keep a run of dynamics and hairpins on one horizontal line, since the eye follows a progression that runs parallel to the stave. See Behind Bars p. 105.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 10. `p`, a crescendo, `f`, a diminuendo and `mp` across six quarter notes.

### Renderers

- Behind Bars: agrees, keeps the dynamics and hairpins on one line
- MuseScore: agrees, keeps the dynamics and hairpins on one line
- Verovio: agrees, keeps the dynamics and hairpins on one line
- OSMD: agrees, keeps the dynamics and hairpins on one line

### Checks

1. Do the dynamics and hairpins in measure 10 all sit on one horizontal line?
   Crop: measure 10, 2 above, 7 below
   Book: p. 105, 0.14 0.455 0.76 0.07
