### The rule

Align a mid-bar tempo indication with the first notational element of its beat. See Behind Bars p. 183.

### The test case

`tempo-indications.musicxml` places `Vivace` on beat 3 of measure 4 over G#4 (with an explicit sharp accidental).

- Measure 4. Quarter A4, quarter rest, then `Vivace` on beat 3 over half-note G#4.

### Renderers

- Behind Bars: agrees, aligns `Vivace` with the first notational element of beat 3
- MuseScore: agrees, aligns `Vivace` with beat 3 (G#4)
- Verovio: agrees, aligns `Vivace` with beat 3 (G#4)
- OSMD: agrees, aligns `Vivace` with beat 3 (G#4)

### Checks

1. Does `Vivace` align with beat 3 (G#4) in measure 4?
   Crop: measure 4, 5 above, 2 below
