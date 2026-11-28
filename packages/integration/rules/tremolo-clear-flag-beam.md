### The rule

When a tremolo note carries a flag or beam, extend the stem if necessary so the tremolo strokes stay completely clear of the flag or beam and never intersect it. See Behind Bars p. 222.

### The test case

`tremolos.musicxml` gives each case its own measure.

- Measure 4. Flagged eighth notes (G4 with one and two strokes, D5 with two strokes) followed by an eighth rest and two beamed eighth-note pairs (A4 with one stroke, C5 with two strokes).

### Renderers

- Behind Bars: agrees, lengthens stems so tremolo strokes clear flags and beams
- MuseScore: agrees, lengthens stems so tremolo strokes stay clear of flags and beams
- Verovio: agrees, lengthens stems so tremolo strokes stay clear of flags and beams
- OSMD: differs, strokes collide with flags and beams on several notes

### Checks

1. Are the tremolo strokes completely clear of the flags on beats 1–2 and the beams on beats 3–4?
   Crop: measure 4, 4 above, 4 below
   Book: p. 222, 0.30 0.30 0.50 0.08
