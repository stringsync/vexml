### The rule

When only one of two unison voices is tied, draw a single tie and separate the two noteheads so it is clear which part is tied. See Behind Bars p. 69.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 13. Voice 1 ties A4 half to A4 half; voice 2 plays untied A4 half, A4 half.

### Renderers

- Behind Bars: agrees, separates the two A4 noteheads with one tie on voice 1
- MuseScore: differs, shares one notehead with one upward tie for voice 1
- Verovio: differs, shares one notehead with one upward tie for voice 1
- OSMD: differs, shares one notehead with one upward tie for voice 1

### Checks

1. Are the two A4 noteheads separated with a single tie on voice 1?
   Crop: measure 13, 4 above, 4 below
