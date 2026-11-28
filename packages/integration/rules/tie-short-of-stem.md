### The rule

Stop a tie short of the next stem unless parts overlap. A tie through a stem looks like a slur to the stem. See Behind Bars p. 63.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 10. A down-stem B4 and D5 chord tied to the next.

### Renderers

- Behind Bars: agrees, the tie stops before the next stem
- MuseScore: agrees, both ties stop short of the stem
- Verovio: agrees, both ties stop short of the stem
- OSMD: agrees, both ties stop short of the stem

### Checks

1. Do both ties stop short of the second chord’s stem?
   Crop: measure 10, 4 above, 4 below
