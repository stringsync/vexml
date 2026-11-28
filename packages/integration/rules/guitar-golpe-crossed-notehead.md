### The rule

Notate *golpe* rhythms with crossed noteheads just outside the stave accompanied by the *golpe* marking. See Behind Bars p. 383.

### The test case

`guitar-techniques.musicxml` isolates *golpe* notation in measure 8.

- Measure 8. Four quarter-note rhythms using crossed noteheads (`<notehead>x</notehead>`) placed just above (`A5`) and below (`C4`) the stave with `golpe` text and `<golpe/>`.

### Renderers

- Behind Bars: agrees, draws crossed noteheads cleanly outside the stave with the *golpe* marking
- MuseScore: agrees, draws crossed noteheads cleanly outside the stave with `golpe` and the golpe symbol above
- Verovio: agrees, draws crossed noteheads cleanly outside the stave with `golpe` above
- OSMD: agrees, draws crossed noteheads cleanly outside the stave with `golpe` above

### Checks

1. Does measure 8 draw crossed noteheads clearly outside the stave alongside the *golpe* marking with no collisions?
   Crop: measure 8, 6 above, 4 below
   Book: p. 383, 0.14 0.19 0.25 0.08
