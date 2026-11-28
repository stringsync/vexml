### The rule

Draw grace notes with small noteheads, stems shortened to about 2¼ stave-spaces, and proportionally scaled tails, beams and accidentals (sharps and naturals about 2 spaces tall, flats about 1¾ spaces tall). See Behind Bars p. 125.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 1. A slashed grace note with a sharp (`G#4`) and an unslashed appoggiatura with a flat (`Bb4`), followed by full-sized quarter notes for comparison.

### Renderers

- Behind Bars: agrees, draws small noteheads, ~2¼-space stems and scaled accidentals
- MuseScore: agrees, draws small noteheads, shortened stems and scaled accidentals
- Verovio: agrees, draws small noteheads, shortened stems and scaled accidentals
- OSMD: agrees, draws small noteheads, shortened stems and scaled accidentals

### Checks

1. Are the grace noteheads, stems and accidentals in measure 1 scaled down proportionally relative to the full-sized notes?
   Crop: measure 1, 3 above, 3 below
   Book: p. 125, 0.30 0.41 0.40 0.06
