### The rule

Leave an upward arpeggio unmarked by default, add a downward arrow at the bottom for a top-to-bottom roll, and draw an upward arrow at the top when specified. See Behind Bars p. 131.

### The test case

`arpeggios.musicxml` isolates single-stave arpeggio rules by measure.

- Measure 2. Three `E4-G4-B4` quarter-note chords: unmarked `<arpeggiate/>`, `<arpeggiate direction="down"/>`, and `<arpeggiate direction="up"/>`.

### Renderers

- Behind Bars: agrees, draws a plain wavy line, a downward arrow at the bottom, and an upward arrow at the top
- MuseScore: agrees, draws a plain wavy line, a downward arrow at the bottom, and an upward arrow at the top
- Verovio: agrees, draws a plain wavy line, a downward arrow at the bottom, and an upward arrow at the top
- OSMD: agrees, draws a plain wavy line, a downward arrow at the bottom, and an upward arrow at the top

### Checks

1. Do the three arpeggiated chords in measure 2 show a plain wavy line, a downward arrow at the bottom, and an upward arrow at the top?
   Crop: measure 2, 4 above, 3 below
   Book: p. 131, 0.39 0.77 0.22 0.05
