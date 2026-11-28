### The rule

Place a plain vertical arrow (up or down) above or before a strummed adjacent-string chord to show strum direction without a wavy arpeggio line. See Behind Bars p. 360.

### The test case

`harp-marks.musicxml` uses a single-staff treble harp part.

- Measure 2. Two four-note half-note chords (`C4/E4/G4/B4` and `D4/F4/A4/C5`), the first with an upward `<arrow>` and the second with a downward `<arrow>`, placement unspecified.

### Renderers

- Behind Bars: agrees, draws plain vertical up and down arrows above the chords
- MuseScore: differs, omits `<technical><arrow>`
- Verovio: differs, omits `<technical><arrow>`
- OSMD: differs, omits `<technical><arrow>`

### Checks

1. In measure 2, are plain vertical up and down arrows drawn above the two chords without a wavy arpeggio line?
   Crop: measure 2, 6 above, 4 below
   Book: p. 360, 0.22 0.26 0.48 0.065
