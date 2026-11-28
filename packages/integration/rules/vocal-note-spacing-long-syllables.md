### The rule

In vocal music, expand note spacing to accommodate lengthy syllables on short note-values without overlapping text, while still allowing visibly more horizontal space for longer durations so rhythmic proportions stay legible. See Behind Bars p. 440.

### The test case

`vocal-underlay.musicxml` contrasts two groups of beamed sixteenth notes carrying lengthy syllables (`Drift-ing chill clouds`, `climb up the ridge.`) against two intervening quarter notes carrying short syllables (`pass,`, `we`) in measure 7.

- Measure 7. Four sixteenth notes, two quarter notes, and four sixteenth notes with contrasting syllable lengths.

### Renderers

- Behind Bars: agrees, expands sixteenth-note spacing to fit lengthy syllables cleanly while keeping quarter notes visibly wider than individual sixteenths
- MuseScore: agrees, spaces sixteenth-note syllables cleanly without overlap while keeping quarter notes (`pass,`, `we`) visibly wider
- Verovio: agrees, spaces sixteenth-note syllables without overlap while keeping quarter notes visibly wider than individual sixteenths
- OSMD: agrees, spaces sixteenth-note syllables without overlap while keeping quarter notes (`pass,`, `we`) visibly wider

### Checks

1. In measure 7, do all syllables on the sixteenth notes sit clear of each other without overlapping while the two quarter notes (`pass,`, `we`) retain visibly wider horizontal spacing than the sixteenths?
   Crop: measure 7, 3 above, 7 below
   Book: p. 440, 0.220 0.525 0.600 0.056
