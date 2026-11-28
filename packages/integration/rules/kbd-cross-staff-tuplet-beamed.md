### The rule

On a double-stemmed cross-staff beamed tuplet, place the tuplet numeral and bracket clearly outside the stave (or beside the beam on the opposite side to the middle stem(s) or fractional beam) so that it never collides with stems or beams. See Behind Bars pp. 319–320.

### The test case

`keyboard-cross-staff-tuplets.musicxml`, measure 1: two consecutive cross-staff beamed eighth-note triplets in 2/4 time (G2, E4, G4 and A4, C3, F4) with no explicit tuplet `placement`.

### Renderers

- Behind Bars: agrees, places consecutive cross-staff tuplet indications cleanly outside the stave in brackets (or beside the beam opposite the middle stem) without colliding with stems or beams
- MuseScore: differs, places bare numerals on or below the lower stave (the first numeral overlaps bass stave lines) rather than in brackets outside the upper stave
- Verovio: differs, places bare numerals below the lower stave near the lower noteheads without brackets
- OSMD: differs, places both beams and bare numerals above the upper stave with all stems pointing upward

### Checks

1. Are the two cross-staff beamed triplet indications in measure 1 positioned cleanly without colliding with the beams or stems?
   Crop: measure 1, 4 above, 16 below
   Book: p. 320, 0.21 0.17 0.57 0.10
