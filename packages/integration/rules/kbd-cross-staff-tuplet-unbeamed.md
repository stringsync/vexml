### The rule

Where an unbeamed tuplet spans both keyboard staves, stems point inward toward the centre of the system and the tuplet bracket is placed clearly (centred between staves when outer notes are on different staves, or enclosing the whole group) so it visibly encompasses notes on both staves. See Behind Bars p. 320.

### The test case

`keyboard-cross-staff-tuplets.musicxml`, measure 2: an unbeamed quarter-note triplet spanning both staves (G4 on staff 1, E3 and C3 on staff 2) with `bracket="yes"` and no explicit `placement` or `<stem>`.

### Renderers

- Behind Bars: agrees, points stems inward and centres a horizontal bracket between the staves with hooks directed toward the outer notes
- MuseScore: differs, points all stems upward and angles the tuplet bracket diagonally across the upper stave and inter-staff gap
- Verovio: differs, keeps default single-stave stem directions (G4 up, E3 down, C3 up) and places the bracket horizontally above the upper stave
- OSMD: differs, keeps default single-stave stem directions and places the bracket between staves over only the two lower-stave notes

### Checks

1. Does the unbeamed cross-staff triplet in measure 2 clearly encompass notes on both staves with inward stems and a readable bracket?
   Crop: measure 2, 4 above, 16 below
   Book: p. 320, 0.35 0.60 0.29 0.09
