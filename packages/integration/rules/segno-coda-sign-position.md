### The rule

Place segno (𝄋) and coda (𝄌) signs above the stave (or top stave of a system), centred horizontally over the barline. See Behind Bars p. 240.

### The test case

`repeat-sections.musicxml` places segno and coda directions at barlines without explicit `placement` or `default-x`.

- Measure 16. Segno sign at the opening barline.
- Measure 17. Coda sign at the opening barline.

### Renderers

- Behind Bars: agrees, segno and coda signs sit above the stave centred over the barline
- MuseScore: differs, centres segno over the first note rather than the barline
- Verovio: differs, centres segno over the first note rather than the barline
- OSMD: agrees, places segno above the stave at the opening barline

### Checks

1. Are the segno sign (measure 16) and coda sign (measure 17) placed above the stave and centred horizontally over their opening barlines?
   Crop: measure 16, 5 above, 2 below
   Book: p. 239, 0.25 0.32 0.55 0.08
