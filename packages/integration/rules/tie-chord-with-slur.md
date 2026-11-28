### The rule

When a slur connects chords with a tied note, curve the tie and the slur the same way, the slur nested outside the tie, matching MuseScore, Verovio and OSMD. Behind Bars p. 71 places them in opposite directions; vexml follows the renderers instead (decided at the pp. 60–89 checkpoint).

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 21. G4 B4 half slurred to G4 C5 half, with G4 tied.

### Renderers

- Behind Bars: differs, tie and slur curve in opposite directions
- MuseScore: agrees, both tie and slur curve down below the chord
- Verovio: agrees, both tie and slur curve down below the chord
- OSMD: agrees, both tie and slur curve down below the chord

### Checks

1. Do the G4 tie and the chord slur both curve down, the slur below the tie?
   Crop: measure 21, 4 above, 4 below
