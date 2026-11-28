### The rule

Give grace notes up-stems regardless of their position on the stave, except when two parts share a stave, where the lower part takes down-stems. See Behind Bars pp. 126–127.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 4. Single-voice grace notes low (`E4`), high (`F5`) and above the stave (`A5`), with no explicit stem directions.
- Measure 5. Two voices sharing one stave, each with a grace note on beat 1 (`E5` in voice 1, `G4` in voice 2).

### Renderers

- Behind Bars: agrees, stems all single-voice grace notes up and the lower voice of a two-voice stave down
- MuseScore: agrees, stems all single-voice grace notes up and voice 2’s grace note down
- Verovio: differs, stems single-voice grace notes up but stems voice 2’s grace note up on the two-voice stave
- OSMD: agrees, stems all single-voice grace notes up and voice 2’s grace note down

### Checks

1. Do all three single-voice grace notes in measure 4 stem up regardless of height?
   Crop: measure 4, 5 above, 3 below
   Book: p. 126, 0.34 0.83 0.32 0.06
2. In measure 5, does the upper voice’s grace note stem up while the lower voice’s grace note stems down?
   Crop: measure 5, 4 above, 4 below
   Book: p. 126, 0.34 0.83 0.32 0.06
