### The rule

Give a crescendo and the diminuendo that follows it open ends of the same width, side by side on one horizontal line. See Behind Bars p. 103.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 5. A crescendo over two quarter notes followed by a diminuendo over two more.

### Renderers

- Behind Bars: agrees, matches the open ends at one height
- MuseScore: agrees, matches the open ends at one height
- Verovio: agrees, matches the open ends at one height
- OSMD: agrees, matches the open ends at one height

### Checks

1. Are the facing open ends of the two hairpins in measure 5 the same width and at the same height?
   Crop: measure 5, 2 above, 6 below
   Book: p. 103, 0.2 0.76 0.6 0.03
