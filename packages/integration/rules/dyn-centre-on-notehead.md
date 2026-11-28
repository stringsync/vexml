### The rule

Centre each dynamic horizontally on the notehead it belongs to, so it cannot be mistaken for belonging to a neighbouring note. See Behind Bars p. 102.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 2. Four repeated quarter notes carrying `p`, `mf`, `f` and `pp`.

### Renderers

- Behind Bars: agrees, centres each dynamic under its notehead
- MuseScore: agrees, centres each dynamic under its note
- Verovio: agrees, centres each dynamic under its note
- OSMD: agrees, sets each dynamic under its note

### Checks

1. Is each dynamic in measure 2 centred under its own notehead?
   Crop: measure 2, 2 above, 7 below
   Book: p. 102, 0.37 0.82 0.25 0.1
