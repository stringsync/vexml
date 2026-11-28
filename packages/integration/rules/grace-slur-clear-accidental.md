### The rule

Place a grace-note slur above the notes when curving below would collide with an accidental on the measured note. See Behind Bars p. 130.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 11. Beat 1 has a high slashed grace note (`G5`) slurred to a lower measured note with a sharp (`C#5`).

### Renderers

- Behind Bars: agrees, places the slur above the notes to clear the sharp
- MuseScore: differs, curves the slur below down the left of the sharp to the stem end
- Verovio: differs, curves the slur below across the sharp
- OSMD: differs, curves the slur below across the sharp

### Checks

1. Does the first grace-note slur in measure 11 curve above the notes rather than crossing the sharp on `C#5`?
   Crop: measure 11, 5 above, 5 below, from 0 spaces, 12 spaces
   Book: p. 130, 0.35 0.15 0.30 0.06
