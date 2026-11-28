### The rule

When there is no new time signature, align a bar-opening tempo marking with the first notational element (note or accidental) after any clef or key signature, never over the barline. See Behind Bars p. 183.

### The test case

`tempo-indications.musicxml` opens measure 3 with no new time signature and a sharp accidental on beat 1.

- Measure 3. `Presto` over C#5 (with explicit sharp accidental) at the start of the bar.

### Renderers

- Behind Bars: agrees, aligns `Presto` with the first notational element (the sharp accidental), clear of the barline
- MuseScore: agrees, aligns `Presto` with the first notational element, clear of the barline
- Verovio: agrees, aligns `Presto` with the first notational element, clear of the barline
- OSMD: agrees, aligns `Presto` with the first notational element, clear of the barline

### Checks

1. Does `Presto` align with the first notational element of measure 3 rather than the barline?
   Crop: measure 3, 5 above, 2 below
