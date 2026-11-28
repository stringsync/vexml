### The rule

On chords with adjacent seconds (displaced noteheads), keep tremolo strokes the same width as for single-note tremolos; on a whole-note chord with a second, centre the strokes on the notehead that sits on the notional stem side. See Behind Bars p. 222.

### The test case

`tremolos.musicxml` gives each case its own measures.

- Measures 8–9. Half-note seconds G4+A4 and D5+E5 with three tremolo strokes in measure 8, and whole-note second G4+A4 with three strokes in measure 9.

### Renderers

- Behind Bars: agrees, keeps single-note stroke width and centres whole-note chord strokes on the notional-stem-side head
- MuseScore: agrees, keeps single-note stroke width and centres whole-note chord strokes over the left (notional stem-up) notehead
- Verovio: agrees, keeps single-note stroke width and centres whole-note chord strokes over the left (notional stem-up) notehead
- OSMD: differs, draws the whole-note chord strokes directly over the left notehead

### Checks

1. Do the tremolo strokes keep single-note width on the half-note adjacent seconds in measure 8?
   Crop: measure 8, 3 above, 3 below
   Book: p. 222, 0.36 0.84 0.15 0.06
2. On the whole-note adjacent second in measure 9, do the tremolo strokes keep single-note width and centre on the left (notional stem-up) notehead?
   Crop: measure 9, 3 above, 3 below
   Book: p. 222, 0.50 0.84 0.13 0.06
