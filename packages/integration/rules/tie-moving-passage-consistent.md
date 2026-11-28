### The rule

In a passage of single-stemmed moving chords, keep all ties in one consistent direction rather than flipping up and down. See Behind Bars p. 71.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 18. Four quarter chords alternating G4 B4 and B4 D5 with B4 tied across all three transitions.

### Renderers

- Behind Bars: agrees, keeps all three ties in one consistent direction
- MuseScore: differs, alternates up, down, up
- Verovio: differs, alternates up, down, up
- OSMD: differs, alternates up, down, up

### Checks

1. Do all three B4 ties curve in the same direction?
   Crop: measure 18, 4 above, 4 below
