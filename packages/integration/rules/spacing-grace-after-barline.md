### The rule

A grace note may approach a barline in close setting if it leaves at least half a stave space of clearance. (Behind Bars p. 43)

### The test case

`symbol-spacing.musicxml` uses an opening grace note in measure 2.

### Renderers

- Behind Bars: agrees, lets a grace note come within half a space of a barline in close setting
- MuseScore: agrees, the grace note clears the barline by more than half a space
- Verovio: agrees, the grace note clears the barline by more than half a space
- OSMD: agrees, the grace note clears the barline by more than half a space

### Checks

1. Does the first grace note clear the divider by at least half a space?
   Crop: measure 2, 9 spaces
