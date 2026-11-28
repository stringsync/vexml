### The rule

Place the snap pizzicato (Bartók pizzicato) symbol directly above each note to which it applies, drawn as a circle with an upward vertical stroke distinct from the downward-stemmed thumb-position mark. See Behind Bars p. 411.

### The test case

`strings-pizz-harmonics.musicxml` attaches `<snap-pizzicato/>` without explicit `placement`.

- Measure 2. Single-voice quarter notes (A4, C#5, G4) and a three-note chord (G3/D4/B4), each marked with `<snap-pizzicato/>`.

### Renderers

- Behind Bars: agrees, places the snap pizzicato symbol directly above each note with an upward vertical stroke
- MuseScore: agrees, places all four snap pizzicato symbols above the stave with an upward vertical stroke
- Verovio: agrees, places all four snap pizzicato symbols above the stave with an upward vertical stroke
- OSMD: differs, places snap pizzicato on the notehead side (below the stave for up-stem notes) and omits it on the chord

### Checks

1. Are all four snap pizzicato symbols in measure 2 placed above the stave with the vertical stroke pointing upward from the circle?
   Crop: measure 2, 5 above, 2 below
   Book: p. 411, 0.32 0.30 0.36 0.08
