### The rule

Place the divider at or slightly before the next beat position. (Behind Bars p. 41)

### The test case

`rhythmic-spacing.musicxml` uses four equal quarter notes before the divider in measure 3.

### Renderers

- Behind Bars: agrees, places the barline where the next beat would fall or just before it
- MuseScore: agrees, the last quarter to the barline is no wider than a quarter interval
- Verovio: agrees, the last quarter to the barline is no wider than a quarter interval
- OSMD: agrees, the last quarter to the barline is no wider than a quarter interval

### Checks

1. Is the distance from the last quarter to the divider no larger than a quarter-note interval?
   Crop: measure 3
