### The rule

Join alternating time signatures of different denominators with `+` signs between each signature. See Behind Bars p. 180.

### The test case

`metre-indications.musicxml` gives each time-signature form its own measure.

- Measure 3. A three-part mixed-denominator time signature `2/4 + 3/8 + 3/16`.

### Renderers

- Behind Bars: agrees, draws `2/4 + 3/8 + 3/16` with `+` signs between the three signatures
- MuseScore: differs, draws only the final `3/16` signature
- Verovio: agrees, draws `2/4 + 3/8 + 3/16` with `+` signs between the three signatures
- OSMD: differs, sums the beats into `17/16`

### Checks

1. Does measure 3 draw `2/4 + 3/8 + 3/16` legibly with `+` signs and clear spacing before the notes?
   Crop: measure 3, 2 above, 2 below
