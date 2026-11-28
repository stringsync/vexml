### The rule

Give the first unaltered note the largest opening gap, roughly two spaces after a time signature and two-and-a-half after a clef or key signature alone. (Behind Bars p. 42)

### The test case

`symbol-spacing.musicxml` uses a system that starts with all three signatures and a plain first note.

### Renderers

- Behind Bars: agrees, marks 2 spaces from the time signature to an unaltered first note
- MuseScore: agrees, about 2 spaces from the time signature to the first note
- Verovio: differs, about 1½ to 1¾ spaces from the time signature to the first note
- OSMD: differs, about 1¼ spaces from the time signature to the first note

### Checks

1. Is the gap between the time signature and first note at least two spaces?
   Crop: measure 1, from 6 spaces, 8 spaces
   Book: p. 42, 0.50 0.16 0.19 0.06
