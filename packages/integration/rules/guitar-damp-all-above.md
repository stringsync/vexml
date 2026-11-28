### The rule

Place the harp-style damping symbol above the stave to cancel *l.v. sempre* and damp all strings. See Behind Bars p. 384.

### The test case

`guitar-techniques.musicxml` isolates the damp-all symbol in measure 9.

- Measure 9. A dotted half-note chord (`E4-B4-E5`) marked `l.v. sempre`, followed by a quarter rest carrying `<damp-all/>`.

### Renderers

- Behind Bars: agrees, places the circled-cross damping symbol cleanly above the stave over the rest
- MuseScore: differs, omits `<damp-all/>`
- Verovio: differs, omits `<damp-all/>`
- OSMD: differs, omits `<damp-all/>`

### Checks

1. Does the damp-all symbol sit cleanly above the stave over the quarter rest in measure 9?
   Crop: measure 9, 10 above, 3 below
   Book: p. 384, 0.65 0.19 0.20 0.09
