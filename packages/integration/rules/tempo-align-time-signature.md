### The rule

When a tempo or metronome marking coincides with a time signature, align its left edge with the left edge of the time signature. See Behind Bars p. 183.

### The test case

`tempo-indications.musicxml` pairs a tempo indication with a time signature both at the opening and at a mid-system metre change.

- Measure 1. Opening `3/4` time signature with `Allegro`.
- Measure 2. Mid-system `4/4` time signature with `quarter = 96`.

### Renderers

- Behind Bars: agrees, aligns the left edge of `Allegro` with `3/4` and `quarter = 96` with `4/4`
- MuseScore: agrees, aligns `Allegro` with `3/4` and `quarter = 96` with `4/4`
- Verovio: agrees, aligns `Allegro` with `3/4` and `quarter = 96` with `4/4`
- OSMD: differs, aligns `Allegro` with `3/4` in measure 1 but aligns `quarter = 96` with the first note in measure 2

### Checks

1. Does the left edge of `Allegro` align with the left edge of the `3/4` time signature in measure 1?
   Crop: measure 1, 10 above, 2 below
2. Does the left edge of `quarter = 96` align with the left edge of the `4/4` time signature in measure 2?
   Crop: measure 2, 6 above, 2 below
