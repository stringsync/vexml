### The rule

Leave a stave space after a changed clef and about two spaces after a mid-system key or time signature. (Behind Bars p. 42–43)

### The test case

`symbol-spacing.musicxml` uses a bass-clef change before the divider, a new metre after it and a later change to a two-flat key.

### Renderers

- Behind Bars: agrees, marks 1 space after the changed clef before the barline and 2 after a mid-system time or key signature
- MuseScore: differs, about 1–1½ spaces after the new time and key signatures
- Verovio: differs, about 1½ spaces after the new time and key signatures
- OSMD: differs, about 1–1½ spaces after the new time and key signatures

### Checks

1. Is there at least one space after the small bass clef before the divider?
   Crop: measure 2, from 24 spaces, 6 spaces
   Book: p. 43, 0.26 0.11 0.44 0.07

2. Are there about two spaces from the new metre to its first note?
   Crop: measure 3, 8 spaces
   Book: p. 43, 0.26 0.11 0.44 0.07

3. Are there about two spaces from the new key to its first note?
   Crop: measure 4, 9 spaces
   Book: p. 43, 0.26 0.11 0.44 0.07
