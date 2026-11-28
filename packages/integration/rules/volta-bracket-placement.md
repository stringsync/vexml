### The rule

Place first- and second-time ending (volta) brackets above the stave, enclosing the relevant bars with the repeat numeral inside the bracket. See Behind Bars p. 236.

### The test case

`repeat-sections.musicxml` tests standard first- and second-time endings.

- Measures 8–9. First-time ending (`1.`) closing at a backward repeat barline, followed by a second-time ending (`2.`).

### Renderers

- Behind Bars: agrees, brackets above the stave with prominent numerals inside each bracket
- MuseScore: agrees, brackets above the stave with bold numerals inside each bracket
- Verovio: agrees, brackets above the stave with bold numerals inside each bracket
- OSMD: agrees, brackets above the stave with numerals inside each bracket

### Checks

1. Are the `1.` and `2.` volta brackets drawn cleanly above measures 8 and 9 with legible numerals inside each bracket?
   Crop: measure 8, 4 above, 2 below
   Book: p. 236, 0.14 0.64 0.73 0.06
