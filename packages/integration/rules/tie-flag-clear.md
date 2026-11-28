### The rule

Keep a tied chord’s flag clear of its ties, lengthening the stem if needed. A flag running into a tie confuses both. See Behind Bars p. 61.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 8. An up-stem eighth chord, E4 G4 B4, tied to a quarter chord.

### Renderers

- Behind Bars: agrees, a longer stem lifts the flag clear of the ties
- MuseScore: agrees, the flag stands clear above the top tie
- Verovio: agrees, a small top tie sits under the flag, clear of it
- OSMD: agrees, the flag stands clear above the top tie

### Checks

1. Is the flag clear of the top tie?
   Crop: measure 8, 8 spaces, 5 above, 4 below
