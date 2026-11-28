### The rule

A trill that is re-articulated on each note gets its own `tr` sign on every note, with no ties and no line. See Behind Bars p. 137.

### The test case

`trill-lines.musicxml` isolates trill lines by measure.

- Measure 5. Four quarter-note `E5`s, each with `<trill-mark/>` and no wavy line or tie.

### Renderers

- Behind Bars: agrees, a sign on each note with no line
- MuseScore: agrees, a sign on each note
- Verovio: agrees, a sign on each note
- OSMD: agrees, a sign on each note

### Checks

1. In measure 5, does every note have its own `tr` sign and no trill line?
   Crop: measure 5, 6 above, 3 below
