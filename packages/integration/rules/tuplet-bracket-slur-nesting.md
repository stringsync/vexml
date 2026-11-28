### The rule

Place a tuplet bracket outside a shorter slur and inside a longer slur, and move the bracket outside a slur if the two would otherwise intersect. See Behind Bars p. 198.

### The test case

`tuplets-placement.musicxml` pairs tuplet brackets with shorter and longer slurs on the same side.

- Measure 5. Unbeamed 3:2 quarter triplet (D4, E4, F4) with a shorter slur over the first two notes above.
- Measure 6. Two consecutive unbeamed 3:2 eighth+quarter triplets spanned by a single longer slur above.

### Renderers

- Behind Bars: agrees, places the longer bracket outside the shorter slur (M5) and the shorter brackets inside the longer slur (M6)
- MuseScore: differs, places the longer bracket cleanly outside the shorter slur in M5, but lets the longer slur intersect the shorter brackets in M6
- Verovio: agrees, places the longer bracket cleanly outside the shorter slur in M5 and both shorter brackets cleanly inside the longer slur in M6
- OSMD: differs, lets the slur collide with the tuplet numeral in M5 and cut through both shorter brackets in M6

### Checks

1. In measure 5, does the longer triplet bracket sit outside (above) the shorter two-note slur without intersecting it?
   Crop: measure 5, 5 above, 2 below
   Book: p. 198, 0.24 0.56 0.52 0.08
2. In measure 6, do the shorter triplet brackets sit inside (below) the longer slur spanning both triplets without intersecting it?
   Crop: measure 6, 5 above, 2 below
   Book: p. 198, 0.37 0.70 0.26 0.06
