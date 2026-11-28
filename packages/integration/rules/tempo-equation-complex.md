### The rule

Support tied note-values and tuplet ratios over cue-sized notes in complex tempo equations. See Behind Bars pp. 186–187.

### The test case

`tempo-equations-complex.musicxml` encodes a complex metric modulation with `<metronome-tied>` on the left and `<metronome-tuplet>` on the right.

- Measure 2. `dotted-eighth tied to quarter = triplet(quarter + eighth)`.

### Renderers

- Behind Bars: agrees, draws tied cue-sized notes and a bracketed tuplet ratio cleanly in the metric equation
- MuseScore: unavailable, hangs on the fixture's `<metronome-arrows/>`
- Verovio: differs, omits the `<metronome-note>` equation
- OSMD: agrees, draws the tied notes and bracketed triplet ratio in the equation

### Checks

1. Does measure 2 draw the tied dotted-eighth-to-quarter on the left and the bracketed triplet on the right legibly?
   Crop: measure 2, 6 above, 2 below
