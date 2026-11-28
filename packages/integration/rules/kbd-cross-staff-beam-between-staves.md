### The rule

For a cross-staff beamed group spanning both staves of a keyboard grand staff, stems point inward toward the centre of the system (upper-stave stems down, lower-stave stems up) and join a common beam placed in the space between the staves, clear of stave lines where possible. See Behind Bars pp. 314–315.

### The test case

`keyboard-cross-staff-beams.musicxml`, measure 1: two cross-staff eighth-note beamed groups (ascending G2, C3, E4, G4 and descending F4, D4, B2, G2) with no explicit `<stem>` elements.

### Renderers

- Behind Bars: agrees, draws inward-pointing stems joined to a common beam centred in the space between the two staves
- MuseScore: agrees, points upper stems down and lower stems up to a common beam between the two staves
- Verovio: agrees, points upper stems down and lower stems up to a common beam between the two staves
- OSMD: differs, points all stems upward and places both common beams above the upper stave

### Checks

1. Do the cross-staff eighth-note groups in measure 1 use inward-pointing stems joined by a common beam in the space between the two staves?
   Crop: measure 1, 2 above, 15 below
   Book: p. 314, 0.08 0.31 0.38 0.10
