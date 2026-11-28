### The rule

Place articulation on a stemless note as if it were stemmed, treating the middle line as down-stemmed. See Behind Bars p. 119.

### The test case

`articulation.musicxml` isolates each rule by measure.

- Measure 8. A whole note below the middle line.
- Measure 9. A whole note above it.
- Measure 10. A whole note on the middle line.

### Renderers

- Behind Bars: agrees, middle line treated as down-stemmed
- MuseScore: agrees, dot below the low note, above the others
- Verovio: agrees, dot below the low note, above the others
- OSMD: agrees, dot below the low note, above the others

### Checks

1. Is the dot below the whole note, as for an up-stem, in measure 8?
   Crop: measure 8, 4 above, 6 below

2. Is the dot above the whole note, as for a down-stem, in measure 9?
   Crop: measure 9, 4 above, 6 below

3. Is the dot above the whole note on the middle line, as for a down-stem, in measure 10?
   Crop: measure 10, 4 above, 6 below
