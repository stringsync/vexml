### The rule

Curve a single-voice grace-note slur below the grace note, running from notehead to notehead. See Behind Bars p. 129.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 8. Beat 1 has a single grace note (`D5`) slurred to a down-stemmed half note (`C5`); beat 3 has a two-note beamed grace group (`F4-G4`) slurred to an up-stemmed half note (`A4`).

### Renderers

- Behind Bars: agrees, curves both grace slurs below from notehead to notehead
- MuseScore: agrees, curves both grace slurs below from notehead to notehead
- Verovio: agrees, curves both grace slurs below from notehead to notehead
- OSMD: agrees, curves both grace slurs below from notehead to notehead

### Checks

1. Do both grace-note slurs in measure 8 curve below from notehead to notehead (rather than dropping to the end of the down-stem)?
   Crop: measure 8, 4 above, 5 below
   Book: p. 129, 0.36 0.57 0.28 0.06
