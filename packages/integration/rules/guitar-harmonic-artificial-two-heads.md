### The rule

Draw two-note artificial harmonics with an ordinary notehead for the stopped pitch and an open diamond notehead for the touching node across all note values. See Behind Bars pp. 385, 388.

### The test case

`guitar-harmonics-scordatura.musicxml` isolates two-note artificial harmonics in measure 4.

- Measure 4. Two quarter-note artificial harmonics (`E4` stopped + `E5` touching node; `G4` stopped + `C5` touching node) and one half-note artificial harmonic (`A4` stopped + `D5` touching node), using `<artificial/>` with `<base-pitch/>` and `<touching-pitch/>`.

### Renderers

- Behind Bars: agrees, draws an ordinary notehead for the stopped pitch and an open diamond for the touching node on all note values, including quarter notes
- MuseScore: differs, draws ordinary oval noteheads for both stopped and touching pitches without a diamond
- Verovio: differs, draws ordinary oval noteheads for both pitches with stacked harmonic circles above
- OSMD: differs, draws ordinary oval noteheads for both pitches with a harmonic circle below or above

### Checks

1. In measure 4, does every artificial harmonic pair draw an ordinary stopped notehead below an open diamond touching-node notehead, even on quarter notes?
   Crop: measure 4, 4 above, 3 below
   Book: p. 385, 0.56 0.59 0.18 0.08
