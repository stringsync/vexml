### The rule

Draw the standard fixed quarter-tone accidental symbols (half-sharp, three-quarters-sharp, reversed flat, and flat-and-a-half) distinctly so each is immediately distinguishable from a conventional sharp or flat. See Behind Bars p. 96.

### The test case

`microtones.musicxml` isolates arrowed and fixed quarter-tone accidentals by measure.

- Measure 2. Four quarter notes carrying `quarter-sharp`, `three-quarters-sharp`, `quarter-flat` and `three-quarters-flat`.

### Renderers

- Behind Bars: agrees, uses half-sharp, three-quarters-sharp, reversed flat and flat-and-a-half
- MuseScore: agrees, draws all four standard fixed quarter-tone symbols distinctly
- Verovio: agrees, draws all four standard fixed quarter-tone symbols distinctly
- OSMD: agrees, draws all four standard fixed quarter-tone symbols distinctly

### Checks

1. Are all four fixed quarter-tone accidentals in measure 2 drawn as distinct, standard quarter-tone glyphs?
   Crop: measure 2, 4 above, 4 below
   Book: p. 96, 0.26 0.43 0.48 0.06
