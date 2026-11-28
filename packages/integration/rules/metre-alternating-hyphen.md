### The rule

Join irregularly alternating time signatures at the outset with a hyphen between them for clarity. See Behind Bars p. 179.

### The test case

`metre-indications.musicxml` gives each time-signature form its own measure.

- Measure 2. An interchangeable time signature `2/4 - 3/4` using `<interchangeable><time-relation>hyphen</time-relation>`.

### Renderers

- Behind Bars: agrees, draws `2/4 - 3/4` with a centred hyphen between the two signatures
- MuseScore: differs, draws only `2/4` and omits the interchangeable `3/4`
- Verovio: differs, draws `2/4` and `3/4` side by side without a hyphen
- OSMD: differs, draws only `2/4` and omits the interchangeable `3/4`

### Checks

1. Does measure 2 draw `2/4` and `3/4` joined by a centred hyphen without colliding with the following notes?
   Crop: measure 2, 2 above, 2 below
