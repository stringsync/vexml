### The rule

Keep the open end of a hairpin no wider than two stave-spaces. See Behind Bars p. 103.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 4. The same crescendo hairpin, whose open end is measured.

### Renderers

- Behind Bars: agrees, opens the hairpin about one space
- MuseScore: agrees, opens the hairpin about one space
- Verovio: agrees, opens the hairpin about one and a half spaces
- OSMD: agrees, opens the hairpin about one space

### Checks

1. Is the open end of the hairpin in measure 4 no wider than two stave-spaces?
   Crop: measure 4, 2 above, 6 below
   Book: p. 103, 0.2 0.76 0.6 0.03
