### The rule

Draw an arpeggio as a vertical wavy line spanning all arpeggiated noteheads (and not the stems), placed before the chord and before any accidentals, and after the barline. See Behind Bars p. 131.

### The test case

`arpeggios.musicxml` isolates single-stave arpeggio rules by measure.

- Measure 1. An `F#4-A4-C#5` half-note chord with `<arpeggiate/>` and two sharps on beat 1.

### Renderers

- Behind Bars: agrees, places the wavy line after the opening signatures, left of the sharps, spanning only the noteheads
- MuseScore: agrees, places the wavy line left of the sharps, spanning only the noteheads
- Verovio: agrees, places the wavy line left of the sharps, spanning only the noteheads
- OSMD: agrees, places the wavy line left of the sharps, spanning only the noteheads

### Checks

1. Does the arpeggio wavy line in measure 1 sit left of the sharps and span the noteheads without extending along the stem?
   Crop: measure 1, 4 above, 3 below
   Book: p. 131, 0.13 0.44 0.15 0.05
