### The rule

On a double-stemmed cross-staff beamed group, place the slur on the side of the group that has the majority of notes (or above/below when equal), without intersecting the cross-staff beam. See Behind Bars p. 322.

### The test case

`keyboard-cross-staff-slurs.musicxml`, measure 2: two cross-staff beamed eighth-note groups, the first with three notes on staff 1 and one on staff 2, and the second with three notes on staff 2 and one on staff 1, each under an unplaced `<slur>`.

### Renderers

- Behind Bars: agrees, places the slur above the upper-majority group and below the lower-majority group without intersecting the cross-staff beam
- MuseScore: differs, places both slurs above the beams (curving the lower-majority group's slur down from G4 over the beam rather than below the lower-stave notes)
- Verovio: differs, places both slurs above the beams (curving the lower-majority group's slur down from G4 over the beam rather than below the lower-stave notes)
- OSMD: differs, cuts both slurs diagonally across the beams and stems (and places the first beam above the upper stave)

### Checks

1. Does the first slur in measure 2 sit on the upper-majority side and the second slur on the lower-majority side, both staying clear of the cross-staff beams?
   Crop: measure 2, 4 above, 26 below
   Book: p. 322, 0.26 0.16 0.48 0.12
