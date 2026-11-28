### The rule

Place a grace-note slur above the notes when slurring to the uppermost note of a chord so the slur leads to the pitch that resolves the ornament. See Behind Bars p. 130.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 11. Beat 3 has a two-note grace group (`F5-E5`) slurred to an `A4-C5-E5` chord where the uppermost note resolves the ornament.

### Renderers

- Behind Bars: agrees, curves the slur above to the top note of the chord
- MuseScore: differs, curves the slur below the chord
- Verovio: differs, curves the slur below the chord
- OSMD: differs, curves the slur below the chord

### Checks

1. Does the second grace-note slur in measure 11 curve above to the top note of the chord rather than curving down to the stem end?
   Crop: measure 11, 5 above, 6 below
   Book: p. 130, 0.44 0.26 0.12 0.06
