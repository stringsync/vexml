### The rule

Stack circled string numbers vertically above a chord in pitch order when vertical room allows. See Behind Bars p. 374.

### The test case

`guitar-fingering.musicxml` isolates chord string-number stacking in measure 3.

- Measure 3. Two three-note half-note chords (written `G4-B4-E5` on strings `3`, `2`, `1` and `D4-A4-F#5` on strings `4`, `3`, `1`), unmarked placement.

### Renderers

- Behind Bars: agrees, stacks circled string numbers vertically above each chord in top-to-bottom pitch order
- MuseScore: agrees, stacks circled string numbers vertically above each chord in top-to-bottom pitch order
- Verovio: differs, omits `<string>` numbers on a standard notation stave
- OSMD: differs, places Roman string numerals beside the chord noteheads inside the stave

### Checks

1. Do the circled string numbers stack vertically above each chord in measure 3, ordered top-to-bottom to match the chord pitches?
   Crop: measure 3, 10 above, 3 below
   Book: p. 374, 0.28 0.30 0.20 0.09
