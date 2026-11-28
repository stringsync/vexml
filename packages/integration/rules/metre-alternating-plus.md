### The rule

Join a fixed pattern of alternating time signatures at the outset with a `+` sign between them. See Behind Bars p. 179.

### The test case

`metre-indications.musicxml` gives each time-signature form its own measure.

- Measure 1. A composite time signature `2/4 + 6/8` (`<time>` with two `<beats>`/`<beat-type>` pairs).

### Renderers

- Behind Bars: agrees, draws `2/4 + 6/8` with a `+` sign centred between the two time signatures
- MuseScore: differs, draws only `6/8` and drops the first `2/4` signature
- Verovio: agrees, draws `2/4 + 6/8` with a `+` sign between the two signatures
- OSMD: differs, sums the beats into `10/8` instead of `2/4 + 6/8`

### Checks

1. Does the opening time signature draw `2/4` and `6/8` joined by a `+` sign with clean spacing?
   Crop: measure 1, 2 above, 2 below
