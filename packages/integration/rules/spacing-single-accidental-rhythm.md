### The rule

Keep equal-value intervals unchanged when one accidental fits within the ordinary spacing. (Behind Bars p. 43)

### The test case

`symbol-spacing.musicxml` uses a beamed run of eighth notes with only the second note altered in measure 8.

### Renderers

- Behind Bars: agrees, its example (a) keeps equal eighth spacing around a single accidental
- MuseScore: agrees, the flat fits without widening the approach to the second eighth
- Verovio: agrees, the flat fits without widening the approach to the second eighth
- OSMD: agrees, the flat fits without widening the approach to the second eighth

### Checks

1. Does the accidental fit without making the approach to the second eighth wider than the other intervals?
   Crop: measure 8
   Book: p. 43, 0.22 0.64 0.25 0.06
