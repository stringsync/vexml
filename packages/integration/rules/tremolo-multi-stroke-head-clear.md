### The rule

Keep a single-note tremolo of two or more strokes at least one stave-space clear of the notehead so the strokes do not obscure the head. See Behind Bars p. 221.

### The test case

`tremolos.musicxml` gives each case its own measure.

- Measure 3. Quarter notes A4 with two, three, and four tremolo strokes (stems up) and C5 with three strokes (stem down).

### Renderers

- Behind Bars: agrees, keeps two or more tremolo strokes at least one stave-space clear of the notehead
- MuseScore: agrees, lengthens stems so 2, 3, and 4 strokes stay at least a stave-space clear of the notehead
- Verovio: agrees, lengthens stems so 2, 3, and 4 strokes stay at least a stave-space clear of the notehead
- OSMD: agrees, keeps 2, 3, and 4 strokes clear of the notehead

### Checks

1. Are the tremolo strokes on all four notes at least one stave-space clear of their noteheads?
   Crop: measure 3, 4 above, 4 below
   Book: p. 221, 0.16 0.78 0.40 0.06
