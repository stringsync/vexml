### The rule

A trill over tied notes keeps one continuous trill line for the whole tied duration, so the line does not seem to stop on the first written note. See Behind Bars p. 136.

### The test case

`trill-lines.musicxml` isolates trill lines by measure.

- Measure 1. A half-note `E5` with `<trill-mark/>` and a wavy line, tied to a second half-note `E5` where the wavy line stops.

### Renderers

- Behind Bars: agrees, one continuous trill line over the tied notes
- MuseScore: agrees, runs the line over both tied notes
- Verovio: agrees, runs the line over both tied notes
- OSMD: agrees, runs the line over both tied notes

### Checks

1. In measure 1, does the trill line run on across the tied note instead of stopping under the first one?
   Crop: measure 1, 6 above, 3 below
