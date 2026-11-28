### The rule

Place tuplet indications above the stave in vocal music so they stay well clear of the sung text below and appear consistently in one location. See Behind Bars p. 437.

### The test case

`vocal-underlay.musicxml` places vocal lyrics beneath both a beamed down-stem eighth-note triplet and an unbeamed bracketed quarter-note triplet with no explicit tuplet `placement` attribute in measure 1.

- Measure 1. Beamed down-stem eighth-note triplet (`C5, B4, A4`) on beat 1 and bracketed quarter-note triplet (`D5, C5, B4`) on beats 3–4, all carrying lyrics below.

### Renderers

- Behind Bars: agrees, places all vocal tuplet numerals and brackets above the stave away from the lyrics
- MuseScore: differs, places both down-stem vocal tuplets below the stave (above the lyrics) rather than above the stave
- Verovio: differs, places both down-stem vocal tuplets below the stave (above the lyrics) rather than above the stave
- OSMD: agrees, places both the beamed eighth-note triplet numeral and the bracketed quarter-note triplet above the stave clear of the lyrics

### Checks

1. In measure 1, do both the beamed eighth-note triplet numeral and the unbeamed quarter-note triplet bracket sit above the stave clear of the sung text?
   Crop: measure 1, 5 above, 6 below
   Book: p. 437, 0.145 0.210 0.710 0.070
