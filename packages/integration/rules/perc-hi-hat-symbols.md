### The rule

Place hi-hat open (`o`), damped/choked (`+`), and half-open (`ø`) symbols above crossed cymbal noteheads without colliding with noteheads, stems, or staff lines (Behind Bars pp. 281, 298).

### The test case

`percussion-cymbals.musicxml`: a five-line percussion stave with four crossed (`x`) quarter notes above the top line (`G5`) carrying `<open/>`, `<stopped/>`, `<half-muted/>`, and `<stopped/>` technical marks with `placement` omitted.

### Renderers

- Behind Bars: agrees, places `o`, `+`, and `ø` symbols above the crossed cymbal noteheads
- MuseScore: agrees, draws open (`o`), damped (`+`), and half-muted (`⊕`) symbols above the crossed hi-hat noteheads
- Verovio: differs, draws `+` above the damped notes but omits the `<open/>` and `<half-muted/>` symbols
- OSMD: differs, draws `+` above the damped notes but omits the `<open/>` and `<half-muted/>` symbols

### Checks

1. In measure 1, are the open (`o`), damped (`+`), and half-open (`ø`) symbols drawn above each crossed hi-hat notehead without colliding with the noteheads or stave?
   Crop: measure 1, 3 above, 2 below
   Book: p. 298, 0.44 0.59 0.11 0.05
