### The rule

Stack fingering numerals for a chord vertically outside the stave in pitch order, with the highest pitch’s finger at the top and the lowest at the bottom. See Behind Bars p. 309.

### The test case

`keyboard-fingering.musicxml` gives each fingering rule its own measure.

- Measure 2. Staff 1 has a C4/E4/G4 half-note triad with fingerings 1, 3, 5 (default above); staff 2 has a C3/E3/G3 half-note triad with fingerings 5, 3, 1 (`placement="below"`).

### Renderers

- Behind Bars: agrees, stacks chord fingerings vertically outside the stave in pitch order (5 over 3 over 1 above the treble stave, 1 over 3 over 5 below the bass stave)
- MuseScore: agrees, stacks chord fingerings vertically outside both staves in pitch order (5/3/1 above treble, 1/3/5 below bass)
- Verovio: agrees, stacks chord fingerings vertically outside both staves in pitch order (5/3/1 above treble, 1/3/5 below bass)
- OSMD: agrees, stacks chord fingerings vertically outside both staves in pitch order (5/3/1 above treble, 1/3/5 below bass)

### Checks

1. Are the chord fingerings stacked vertically outside the treble and bass staves in pitch order (5, 3, 1 top-to-bottom above treble; 1, 3, 5 top-to-bottom below bass)?
   Crop: measure 2, 6 above, 25 below
   Book: p. 309, 0.17 0.39 0.16 0.18
