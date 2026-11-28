### The rule

Place the fingernail pizzicato sign directly above each note to which it applies. See Behind Bars p. 411.

### The test case

`strings-pizz-harmonics.musicxml` attaches `<fingernails/>` without explicit `placement`.

- Measure 3. Bass-clef quarter notes (E3, A2, C3, G3) each marked with `<fingernails/>`.

### Renderers

- Behind Bars: agrees, places the fingernail sign directly above each note
- MuseScore: agrees, places all four fingernail signs above the stave
- Verovio: agrees, places all four fingernail signs above the stave
- OSMD: unavailable, omits `<fingernails/>` marks

### Checks

1. Are all four fingernail signs in measure 3 placed directly above the stave over their respective notes?
   Crop: measure 3, 5 above, 2 below
   Book: p. 411, 0.40 0.79 0.20 0.07
