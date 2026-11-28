### The rule

Align tuplets rhythmically with all other parts in exact proportional time so simultaneous cross-rhythms fall in their true chronological order. See Behind Bars pp. 200–202.

### The test case

`tuplets-parts.musicxml` pits two cross-rhythms against each other on two staves in measure 2.

- Measure 2, beat 1. Upper stave: beamed 3:2 eighth triplet (G4, A4, B4). Lower stave: two beamed plain eighths (C3, D3).
- Measure 2, beat 2. Upper stave: beamed 5:4 sixteenth quintuplet (G4, A4, B4, C5, D5). Lower stave: beamed 3:2 eighth triplet (C3, D3, E3).

### Renderers

- Behind Bars: agrees, aligns beat 1 and beat 2 vertically and places intermediate cross-rhythm notes in exact chronological order
- MuseScore: agrees, aligns beat 1 and beat 2 vertically and places intermediate cross-rhythm notes in chronological order
- Verovio: agrees, aligns beat 1 and beat 2 vertically and places intermediate cross-rhythm notes in chronological order
- OSMD: agrees, aligns beat 1 and beat 2 vertically and places intermediate cross-rhythm notes in chronological order

### Checks

1. In measure 2, do the simultaneous 3-against-2 and 5-against-3 cross-rhythms align on the beats and order intermediate notes chronologically (triplet 2 before duplet 2 before triplet 3; quintuplet 2 before triplet 2 before quintuplet 3 and 4 before triplet 3 before quintuplet 5)?
   Crop: measure 2, 3 above, 15 below
   Book: p. 200, 0.32 0.74 0.36 0.11
