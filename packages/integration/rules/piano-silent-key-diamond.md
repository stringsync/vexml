### The rule

Notate silently depressed keys with diamond-shaped noteheads, using filled (black) diamonds for quarter notes and shorter values and hollow (white) diamonds for half notes and longer values. See Behind Bars p. 338.

### The test case

`piano-silent-keys.musicxml` places `<notehead>diamond</notehead>` (with no explicit `filled` attribute) on a half note, a quarter note, and two beamed eighth notes in measure 1.

- Measure 1. Half note C3 should draw a hollow diamond notehead; quarter note E3 and eighth notes G3 and B3 should draw filled black diamond noteheads.

### Renderers

- Behind Bars: agrees, half-note diamonds are hollow and quarter/eighth-note diamonds are filled black
- MuseScore: agrees, draws a hollow diamond for the half note and filled black diamonds for the quarter and eighth notes
- Verovio: agrees, draws a hollow diamond for the half note and filled black diamonds for the quarter and eighth notes
- OSMD: agrees, draws a hollow diamond for the half note and filled black diamonds for the quarter and eighth notes

### Checks

1. Is the half-note diamond (beat 1) hollow while the quarter-note and eighth-note diamonds (beats 3–4) are filled black?
   Crop: measure 1, 3 above, 3 below
   Book: p. 338, 0.34 0.54 0.32 0.12
