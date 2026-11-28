### The rule

Place grace notes written at the end of a bar (such as trill finishing notes or a pre-beat group) before the closing barline. See Behind Bars p. 127.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 6. Two trailing 16th grace notes (`C5-D5`) at the end of the bar before the barline into measure 7.

### Renderers

- Behind Bars: agrees, places end-of-bar grace notes before the barline
- MuseScore: agrees, places the trailing grace notes before the closing barline
- Verovio: agrees, places the trailing grace notes before the closing barline
- OSMD: agrees, places the trailing grace notes before the closing barline

### Checks

1. Do the two trailing grace notes at the end of measure 6 sit after the second half note and before the closing barline?
   Crop: measure 6, 4 above, 3 below
   Book: p. 127, 0.23 0.61 0.22 0.06
