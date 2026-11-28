### The rule

When simultaneous parts have non-coinciding barlines, align a note on the first beat of a bar in one part with the simultaneous note in the other part rather than with its barline. See Behind Bars p. 176.

### The test case

`metre-polymetre.musicxml` measure 5 writes twelve eighth notes in both parts with mid-measure barlines dividing Part 1 into 3/8 bars (every 3 eighths) and Part 2 into 2/4 bars (every 4 eighths).

- Measure 5. Simultaneous eighth notes at indices 4, 5, 7 and 9 align vertically across both parts despite the staggered mid-measure barlines.

### Renderers

- Behind Bars: agrees, aligns simultaneous notes across the staggered barlines rather than aligning a note with another part’s barline
- MuseScore: agrees, aligns all simultaneous eighth notes vertically across both parts while drawing each part’s mid-measure barlines independently
- Verovio: differs, draws both parts’ barlines at the same 3/8 positions instead of independent staggered barlines
- OSMD: differs, omits the mid-measure barlines entirely

### Checks

1. In measure 5, does each downbeat note after a mid-measure barline align vertically with the simultaneous note in the other part rather than with the barline?
   Crop: measure 5, 2 above, 18 below
   Book: p. 176, 0.25 0.15 0.50 0.10
