### The rule

The accidental for the trilling note goes beside or above the `tr` sign, never over the notehead or stave. See Behind Bars p. 138.

### The test case

`trill-lines.musicxml` isolates trill lines by measure.

- Measure 6. A half-note `E5` with a sharp trilling-note accidental and a half-note `G5` with a flat one.

### Renderers

- Behind Bars: agrees, accidental after or above the sign
- MuseScore: differs, leaves the accidental out
- Verovio: agrees, small accidental above the sign
- OSMD: differs, puts the accidental below the sign, between sign and notehead

### Checks

1. In measure 6, does each accidental sit clear of its `tr` sign and above the stave?
   Crop: measure 6, 10 above, 3 below
