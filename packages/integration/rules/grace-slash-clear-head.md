### The rule

Position the diagonal stroke so it intersects the grace note’s tail or beam cleanly without colliding with the notehead, leaving white space between stem, tail or beam and stroke. See Behind Bars p. 126.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 2. Beat 1 has a single slashed grace note (`F4` before `G4`).

### Renderers

- Behind Bars: agrees, crosses the stem and tail clear of the notehead
- MuseScore: agrees, crosses the stem and tail cleanly above the notehead
- Verovio: agrees, crosses the stem and tail cleanly above the notehead
- OSMD: agrees, crosses the stem and tail cleanly above the notehead

### Checks

1. Does the diagonal slash on the first grace note in measure 2 cross the stem and tail cleanly without colliding with the notehead?
   Crop: measure 2, 3 above, 3 below, from 0 spaces, 10 spaces
   Book: p. 126, 0.25 0.15 0.23 0.05
