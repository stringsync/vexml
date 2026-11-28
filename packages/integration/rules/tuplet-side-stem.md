### The rule

Normally place a tuplet indication on the stem side of the notes so the notehead side stays clear for articulations and slurs. See Behind Bars p. 197.

### The test case

`tuplets-placement.musicxml` pairs unbeamed quarter triplets with slurs and staccato dots with no explicit tuplet placement.

- Measure 1. Up-stem triplet (D4, E4, F4) with slur and staccato.
- Measure 2. Down-stem triplet (C5, D5, E5) with slur and staccato.

### Renderers

- Behind Bars: agrees, places the up-stem triplet bracket above and the down-stem triplet bracket below, opposite the slurs and articulations
- MuseScore: agrees, places the up-stem triplet bracket above and the down-stem triplet bracket below
- Verovio: agrees, places the up-stem triplet bracket above and the down-stem triplet bracket below
- OSMD: differs, places both triplet brackets above the stave (putting the down-stem bracket on the notehead side in measure 2)

### Checks

1. In measure 1, is the up-stem triplet bracket placed above the stave on the stem side?
   Crop: measure 1, 3 above, 3 below
   Book: p. 197, 0.39 0.86 0.22 0.06
2. In measure 2, is the down-stem triplet bracket placed below the stave on the stem side?
   Crop: measure 2, 3 above, 3 below
   Book: p. 197, 0.39 0.86 0.22 0.06
