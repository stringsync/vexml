### The rule

For unbeamed tuplets, brackets may either slant gently in the direction of the outer pitches (matching an equivalent beam slant) or remain horizontal. See Behind Bars pp. 196–197.

### Why a person decides

Behind Bars explicitly permits both gently slanted brackets and horizontal brackets for unbeamed tuplets.

### The test case

`tuplets-bracket.musicxml` places ascending and descending unbeamed quarter triplets in measures 4 and 5.

- Measure 4. Ascending unbeamed 3:2 quarter triplet (E4, A4, D5).
- Measure 5. Descending unbeamed 3:2 quarter triplet (D5, A4, E4).

### Renderers

- Behind Bars: agrees, permits either gentle beam-angle slant or horizontal brackets on unbeamed tuplets
- MuseScore: agrees, draws horizontal brackets on both ascending and descending unbeamed triplets
- Verovio: agrees, draws horizontal brackets on both ascending and descending unbeamed triplets
- OSMD: agrees, draws horizontal brackets on both ascending and descending unbeamed triplets

### Checks

1. In measures 4 and 5, do the unbeamed tuplet brackets follow a clean gentle slant or sit horizontal without colliding with stems or noteheads?
   Crop: measure 4, 4 above, 3 below
   Book: p. 196, 0.31 0.82 0.37 0.07
2. Is the descending unbeamed tuplet bracket in measure 5 cleanly angled or horizontal?
   Crop: measure 5, 4 above, 3 below
   Book: p. 197, 0.15 0.25 0.68 0.07
