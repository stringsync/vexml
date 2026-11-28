### The rule

When a slur's outer notes have opposite stem directions, move the slur toward the noteheads so it does not tilt against the direction of the pitches. See Behind Bars p. 111.

### The test case

`slurs.musicxml` isolates each rule by measure.

- Measure 13. A rising slur from a stems-up first note to a stems-down last note.

### Renderers

- Behind Bars: agrees, slur rises with the pitches
- MuseScore: agrees, slur rises with the pitches
- Verovio: agrees, slur rises with the pitches
- OSMD: differs, slur below the notes

### Checks

1. Does the slur in measure 13 rise with the pitches rather than tilt against them?
   Crop: measure 13, 7 above, 3 below
   Book: p. 111, 0.26 0.69 0.47 0.04
