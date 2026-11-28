### The rule

When tied unison voices have different durations, it is acceptable to reverse the horizontal order of noteheads so the tied notehead sits nearer its tie. See Behind Bars p. 70.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 14. Voice 1 ties A4 quarter to A4 quarter; voice 2 plays untied A4 half.

### Renderers

- Behind Bars: agrees, allows placing the tied quarter on the right nearer its tie
- MuseScore: differs, keeps voice 1 quarter on the left and curves its tie up over the half note
- Verovio: differs, keeps voice 1 quarter on the left and curves its tie up over the half note
- OSMD: differs, keeps voice 1 quarter on the left and curves its tie up over the half note

### Why a person decides

Gould presents reversing the notehead order as acceptable rather than mandatory, and renderers differ on whether to keep the upper voice left.

### Checks

1. Does the tied quarter A4 sit to the right of the untied half A4, nearer its tie?
   Crop: measure 14, 4 above, 4 below
