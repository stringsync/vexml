### The rule

A trill line stops at the barline rather than running into the next bar. See Behind Bars p. 136.

### The test case

`trill-lines.musicxml` isolates trill lines by measure.

- Measure 3. A trilled half-note `D5` on the last beats of the bar, with the wavy line stopping on the first note of measure 4.

### Renderers

- Behind Bars: agrees, line stops at the barline
- MuseScore: agrees, line ends at the barline
- Verovio: agrees, line ends at the barline
- OSMD: agrees, line ends at the barline

### Checks

1. In measure 3, does the trill line end at the barline without crossing it?
   Crop: measure 3, 6 above, 3 below
