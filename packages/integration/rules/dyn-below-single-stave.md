### The rule

Place the dynamics of a part on its own single stave below the stave, so they read as one line under the notes. See Behind Bars p. 101.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 1. Four quarter notes with `p` before the first and `f` before the third, no `placement` set.

### Renderers

- Behind Bars: agrees, places the dynamics below the stave
- MuseScore: agrees, places the dynamics below the stave, close to the notes
- Verovio: agrees, places the dynamics below the stave
- OSMD: agrees, places the dynamics below the stave, close to the notes

### Checks

1. Do both dynamics in measure 1 sit below the stave?
   Crop: measure 1, 2 above, 7 below
   Book: p. 102, 0.34 0.15 0.23 0.07
