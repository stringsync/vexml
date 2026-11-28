### The rule

A slur spanning notes across both keyboard staves connects smoothly between the start and end noteheads (or arcs around the whole phrase above or below) without awkwardly cutting through the middle of the phrase. See Behind Bars p. 321.

### The test case

`keyboard-cross-staff-slurs.musicxml`, measure 1: an ascending cross-staff phrase (G2 and C3 on staff 2 to E4 and G4 on staff 1) and a descending cross-staff phrase (A4 and F4 on staff 1 to D3 and B2 on staff 2), each with an unplaced `<slur>` spanning the four eighth notes.

### Renderers

- Behind Bars: agrees, draws a smooth slur connecting the start and end noteheads across both staves without cutting awkwardly across the middle notes
- MuseScore: agrees, draws smooth curved cross-staff slurs directly between the start and end noteheads of both phrases
- Verovio: agrees, draws smooth curved cross-staff slurs directly between the start and end noteheads of both phrases
- OSMD: agrees, draws diagonal slurs connecting the start and end noteheads across both staves

### Checks

1. Do both cross-staff slurs in measure 1 connect smoothly from the starting stave to the ending stave without awkwardly cutting through the phrase?
   Crop: measure 1, 3 above, 26 below
   Book: p. 321, 0.28 0.37 0.43 0.11
