### The rule

Indicate finger substitution on a held note using a dash or small slur connecting the two numerals (such as `5–4` or `5⁀4`). See Behind Bars p. 309.

### The test case

`keyboard-fingering.musicxml` gives each fingering rule its own measure.

- Measure 4. Staff 1 has half notes G4 (fingering 5 substituting to 4 via `substitution="yes"`) and A4 (3 substituting to 2); staff 2 has a whole note C3 (5 substituting to 4, `placement="below"`).

### Renderers

- Behind Bars: agrees, joins the substituted finger numerals with a dash or small slur
- MuseScore: differs, stacks the two numerals vertically without a dash or slur
- Verovio: differs, stacks the two numerals vertically without a dash or slur
- OSMD: differs, stacks the two numerals vertically without a dash or slur

### Checks

1. Does each finger substitution display both numerals joined by a dash or small slur clear of the stave?
   Crop: measure 4, 4 above, 22 below
   Book: p. 309, 0.48 0.80 0.22 0.10
