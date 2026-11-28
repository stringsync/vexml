### The rule

Place qualifying words (such as `poco a poco`) above or below a hairpin and never inside it. See Behind Bars p. 106.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 12. A crescendo below the stave with `poco a poco` in the same direction.

### Renderers

- Behind Bars: agrees, sets the words below the hairpin
- MuseScore: agrees, sets the words below the hairpin
- Verovio: agrees, sets the words above the hairpin
- OSMD: agrees, sets the words below the hairpin

### Checks

1. Is `poco a poco` in measure 12 clear of the hairpin, above or below it?
   Crop: measure 12, 2 above, 8 below
   Book: p. 106, 0.1 0.69 0.76 0.04
