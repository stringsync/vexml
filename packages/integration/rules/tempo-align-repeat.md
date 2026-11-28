### The rule

When a repeat sign acts as a barline, align the tempo with the following first element of the notation; when the repeat sign opens a system (not acting as a barline), align the tempo with the repeat sign itself. See Behind Bars p. 183.

### The test case

`tempo-indications.musicxml` tests both repeat-sign positions.

- Measure 5. Mid-system forward repeat barline with `Più mosso` over Bb4.
- Measure 6. System-opening forward repeat sign (after clef and key signature) with `Animando` over G#4.

### Renderers

- Behind Bars: agrees, aligns `Più mosso` with Bb4 after the mid-system repeat barline and `Animando` with the system-opening repeat sign
- MuseScore: differs, aligns both `Più mosso` and `Animando` with the first note rather than the system-opening repeat sign
- Verovio: differs, aligns both `Più mosso` and `Animando` with the first note rather than the system-opening repeat sign
- OSMD: agrees, aligns `Più mosso` with Bb4 after the mid-system repeat barline and `Animando` with the system-opening repeat sign

### Checks

1. Does `Più mosso` align with the first note (Bb4) after the mid-system repeat barline in measure 5?
   Crop: measure 5, 5 above, 2 below
2. Does `Animando` align with the system-opening repeat sign in measure 6?
   Crop: measure 6, 5 above, 2 below
