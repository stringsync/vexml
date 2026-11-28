### The rule

When two parts share one stave and both carry grace notes before the same beat, align their grace notes vertically. See Behind Bars p. 128.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 5. Voice 1 (`E5`) and voice 2 (`G4`) both open with a single grace note before beat 1.

### Renderers

- Behind Bars: agrees, aligns the two voices’ grace notes vertically
- MuseScore: agrees, aligns voice 1 and voice 2’s grace notes vertically
- Verovio: agrees, aligns voice 1 and voice 2’s grace notes vertically
- OSMD: agrees, aligns voice 1 and voice 2’s grace notes vertically

### Checks

1. Are the voice 1 and voice 2 grace noteheads in measure 5 aligned vertically?
   Crop: measure 5, 4 above, 4 below, from 0 spaces, 10 spaces
   Book: p. 128, 0.40 0.48 0.20 0.06
