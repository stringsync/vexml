### The rule

Mark unmeasured single-note tremolos with stem strokes and place prescribed right-hand fingering patterns above the note clear of the stem and strokes. See Behind Bars p. 380.

### The test case

`guitar-techniques.musicxml` isolates single-note guitar tremolos in measure 6.

- Measure 6. Two half notes (`E5` with `<pluck>pami</pluck>`, `G4` with `<pluck>i</pluck>`), each carrying `<tremolo type="single">3</tremolo>`.

### Renderers

- Behind Bars: agrees, draws three tremolo strokes through the stem with right-hand fingering clearly above the note
- MuseScore: agrees, draws three tremolo strokes through the stem with italic `pami` and `i` cleanly above each note
- Verovio: differs, draws three tremolo strokes through the stem but omits `<pluck>` markings
- OSMD: differs, draws three tremolo strokes through the stem but omits `<pluck>` markings

### Checks

1. Do the tremolo notes in measure 6 draw three stem strokes with the right-hand fingering (`pami`, `i`) cleanly above the note and clear of the stem?
   Crop: measure 6, 5 above, 4 below
   Book: p. 380, 0.29 0.81 0.30 0.08
