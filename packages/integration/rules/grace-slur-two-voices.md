### The rule

When two parts share a stave, curve grace-note slurs away from the stave (above for the upper voice, below for the lower voice), sitting close to the noteheads where needed to clear beams. See Behind Bars p. 129.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 9. Voice 1 (`F5 → E5`) and voice 2 (`A4 → G4`) each have a slurred grace note on beat 1 with no `placement` set.

### Renderers

- Behind Bars: agrees, curves the upper voice’s grace slur above and the lower voice’s below
- MuseScore: agrees, curves the upper voice’s grace slur above and the lower voice’s below
- Verovio: agrees, curves the upper voice’s grace slur above and the lower voice’s below
- OSMD: differs, curves the upper voice’s grace slur below and the lower voice’s above (between the voices)

### Checks

1. In measure 9, does the upper voice’s grace slur curve above and the lower voice’s grace slur curve below?
   Crop: measure 9, 5 above, 4 below
   Book: p. 129, 0.30 0.71 0.40 0.07
