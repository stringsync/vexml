### The rule

Place a fermata further from the stave than other markings stacked on the notehead (articulations and trills), except for an octave sign which sits outside the fermata. See Behind Bars pp. 188–189.

### The test case

`pauses.musicxml` stacks a fermata with articulations, a trill, and an `8va` octave shift in measure 6.

- Measure 6. Beat 1: down-stem D5 with staccato, accent and fermata. Beat 2: A4 with trill and fermata. Beat 3: E5 (under `8va`) with fermata.

### Renderers

- Behind Bars: agrees, places the fermata outside staccato, accent and trill, but inside the `8va` octave sign
- MuseScore: agrees, places the fermata above staccato + accent and above `tr`, while keeping it below `8`
- Verovio: differs, places the fermata above staccato + accent and `tr`, but places the fermata above `8`
- OSMD: differs, places `tr` above the fermata on beat 2

### Checks

1. Does the fermata sit above staccato + accent (beat 1) and above `tr` (beat 2), while staying below the `8va` sign (beat 3)?
   Crop: measure 6, 7 above, 2 below
