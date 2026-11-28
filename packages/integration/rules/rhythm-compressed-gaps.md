### The rule

Allow more room after longer values, compressing their distances relative to literal elapsed time so the rhythm stays readable. (Behind Bars p. 39–40)

### The test case

`rhythmic-spacing.musicxml` uses a half, a quarter and two eighths on the same pitch in measure 2.

### Renderers

- Behind Bars: agrees, its proportional table on p. 39 gives a half note about twice an eighth's room, not four times
- MuseScore: agrees, the half, quarter and eighth gaps shrink with duration but far less than 4:2:1
- Verovio: agrees, the gaps shrink with duration without literal time spacing
- OSMD: agrees, the gaps shrink with duration without literal time spacing

### Checks

1. Do the spacings decrease with the durations without following a literal four-to-two-to-one ratio?
   Crop: measure 2
   Book: p. 39, 0.31 0.71 0.52 0.09
