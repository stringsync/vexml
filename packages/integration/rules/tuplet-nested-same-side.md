### The rule

When both outer and inner tuplet indications sit on the same side of a group, place the outer (whole-tuplet) indication further from the notes than the inner ones, with clear separation so numerals and brackets never collide. See Behind Bars p. 214.

### The test case

`tuplet-ratios.musicxml` gives each case its own measure.

- Measure 6. Two beats of nested triplets with explicit same-side placement: beat 1 has both outer and inner tuplets `placement="above"`, and beat 2 has both `placement="below"`.

### Renderers

- Behind Bars: agrees, places the outer bracketed numeral outside the inner numerals with clear separation
- MuseScore: differs, mis-imports the nested tuplets as separate `9` brackets
- Verovio: differs, draws only the inner `3` brackets and omits the outer tuplet
- OSMD: differs, draws overlapping `3` brackets and omits the outer tuplet

### Checks

1. Does the outer bracketed `3` sit further from the notes than the three inner `3`s on both beat 1 (above) and beat 2 (below), with no overlap?
   Crop: measure 6, 5 above, 5 below
   Book: p. 214, 0.14 0.38 0.52 0.07
