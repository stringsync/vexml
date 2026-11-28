### The rule

Print the tuplet numeral in italic type, about 1½ stave-spaces high, to distinguish it from roman fingering and player numerals. See Behind Bars p. 193.

### The test case

`tuplets-numeral.musicxml` places a beamed eighth-note triplet in measure 1 with no explicit font or size attributes.

- Measure 1. Beamed 3:2 eighth-note triplet (C4, D4, E4) in 2/4.

### Renderers

- Behind Bars: agrees, prints the numeral in italic about 1½ stave-spaces high
- MuseScore: agrees, prints an italic `3` about 1½ stave-spaces high
- Verovio: agrees, prints an italic `3` about 1½ stave-spaces high
- OSMD: differs, prints a bold roman `3` rather than italic

### Checks

1. Is the triplet numeral in measure 1 printed in italic type at about 1½ stave-spaces high?
   Crop: measure 1, 3 above, 2 below
   Book: p. 193, 0.31 0.56 0.37 0.06
