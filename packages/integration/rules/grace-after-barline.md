### The rule

Place grace notes preceding the first beat of a bar after the barline and before the measured beat. See Behind Bars p. 127.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 7. A single grace note (`F5`) preceding the first beat (`E5`) of the bar.

### Renderers

- Behind Bars: agrees, places the grace note after the barline before beat 1
- MuseScore: agrees, places the grace note after the barline before beat 1
- Verovio: agrees, places the grace note after the barline before beat 1
- OSMD: agrees, places the grace note after the barline before beat 1

### Checks

1. Does the grace note in measure 7 sit after the barline and before the first beat?
   Crop: measure 7, 4 above, 3 below
   Book: p. 127, 0.36 0.31 0.28 0.06
