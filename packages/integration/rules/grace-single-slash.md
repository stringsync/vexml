### The rule

Draw a single grace note as a small eighth note with a diagonal stroke intersecting the tail, and omit the diagonal stroke for an appoggiatura so the two cannot be confused. See Behind Bars p. 125.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 1. Beat 1 has a slashed single grace note (`slash="yes"`); beat 2 has an unslashed appoggiatura (`slash="no"`).

### Renderers

- Behind Bars: agrees, slashes the single grace note and leaves the appoggiatura unslashed
- MuseScore: agrees, slashes the first grace note and leaves the second unslashed
- Verovio: agrees, slashes the first grace note and leaves the second unslashed
- OSMD: agrees, slashes the first grace note and leaves the second unslashed

### Checks

1. Does the first grace note in measure 1 carry a diagonal slash through its tail while the second (appoggiatura) has none?
   Crop: measure 1, 3 above, 3 below
   Book: p. 125, 0.30 0.41 0.40 0.06
