### The rule

Centre the `=` sign of a tempo equation over the barline so each note-value stands above the bar of its own tempo. See Behind Bars p. 185.

### The test case

`tempo-indications.musicxml` changes from `3/2` in measure 11 to `3/4` in measure 12 with `<metronome><beat-unit>half</beat-unit><beat-unit>quarter</beat-unit></metronome>`.

- Measures 11–12. Metre change `3/2` to `3/4` with `half = quarter` at the start of measure 12.

### Renderers

- Behind Bars: agrees, centres the `=` sign of `half = quarter` over the barline between measures 11 and 12
- MuseScore: differs, places `half = quarter` over the first note of measure 12 rather than over the barline
- Verovio: differs, places `half = quarter` over the time signature and first note of measure 12 rather than over the barline
- OSMD: differs, places `half = quarter` over the first note of measure 12 rather than over the barline

### Checks

1. Is the `=` sign of `half = quarter` centred over the barline between measures 11 and 12?
   Crop: measure 11, 18 spaces, 6 above, 2 below
