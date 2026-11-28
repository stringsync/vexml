### The rule

For a two-note tremolo spanning two staves of a braced part, draw the tremolo beams between the staves as if beamed mid-system (for both stemmed and whole notes). See Behind Bars p. 227.

### The test case

`two-note-tremolos-multi.musicxml` uses a two-staff piano part.

- Measure 1. Two cross-staff half-note tremolos (G3 to E4 and G4 to A3) with three strokes.
- Measure 2. A cross-staff whole-note tremolo (C5 to E3) with three strokes.

### Renderers

- Behind Bars: agrees, tremolo beams sit between the two staves for both half-note and whole-note cross-staff tremolos
- MuseScore: agrees, draws three tremolo beams between the two staves for both half-note and whole-note pairs
- Verovio: agrees, draws three tremolo beams between the two staves for both half-note and whole-note pairs
- OSMD: differs, omits the cross-staff tremolo beams

### Checks

1. Are tremolo beams drawn between the two staves for the cross-staff half-note tremolos in measure 1?
   Crop: measure 1, 3 above, 13 below
   Book: p. 227, 0.29 0.36 0.42 0.10
2. Are tremolo beams drawn between the two staves for the cross-staff whole-note tremolo in measure 2?
   Crop: measure 2, 3 above, 13 below
   Book: p. 227, 0.29 0.36 0.42 0.10
