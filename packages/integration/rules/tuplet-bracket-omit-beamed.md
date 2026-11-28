### The rule

Omit the tuplet bracket when the entire tuplet is joined by a single beam and the numeral sits next to the beam. See Behind Bars p. 200.

### The test case

`tuplets-placement.musicxml` leaves the `bracket` attribute unset on a fully beamed eighth-note triplet.

- Measure 9. Fully beamed 3:2 eighth triplet (C5, D5, E5) followed by a quarter rest, with no explicit `bracket` attribute.

### Renderers

- Behind Bars: agrees, omits the bracket and prints only the numeral beside the beam
- MuseScore: agrees, omits the bracket and prints only the numeral beside the beam
- Verovio: agrees, omits the bracket and prints only the numeral beside the beam
- OSMD: agrees, omits the bracket (printing the numeral above the stave rather than beside the beam)

### Checks

1. In measure 9, is the bracket omitted so only the `3` appears beside the beam?
   Crop: measure 9, 3 above, 3 below
   Book: p. 200, 0.37 0.15 0.26 0.05
