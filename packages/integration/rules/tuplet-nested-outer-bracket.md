### The rule

Enclose the outer tuplet numeral of a nested tuplet in a bracket even when the group is beamed, so it is unmistakable that the outer numeral governs the entire group. See Behind Bars p. 213.

### The test case

`tuplet-ratios.musicxml` gives each case its own measure.

- Measure 5. Two beats of nested triplets (three groups of three beamed sixteenth notes under an outer triplet) with neither `bracket` nor `placement` set: beat 1 stems up (G4 and A4) and beat 2 stems down (D5 and C5).

### Renderers

- Behind Bars: agrees, encloses the outer tuplet numeral in a bracket
- MuseScore: differs, mis-imports the nested tuplets as separate `9` brackets with rests
- Verovio: differs, draws only the inner `3` brackets and omits the outer tuplet
- OSMD: differs, omits the outer tuplet and most of the inner numerals

### Checks

1. Does the outer `3` carry a bracket spanning all nine sixteenth notes on both the stem-up and stem-down groups?
   Crop: measure 5, 5 above, 5 below
   Book: p. 214, 0.30 0.15 0.40 0.06
