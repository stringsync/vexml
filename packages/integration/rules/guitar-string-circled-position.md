### The rule

Enclose a string number in a circle and place it above or below the stave, whichever position is closest to the relevant note. See Behind Bars p. 373.

### The test case

`guitar-fingering.musicxml` isolates string designation in measure 2.

- Measure 2. Two low notes (written `A3`, `D4`) and two high notes (written `B4`, `E5`), each carrying an unmarked `<string>` (`5`, `4`, `2`, `1`).

### Renderers

- Behind Bars: agrees, places circled string numbers below the stave for low notes and above for high notes
- MuseScore: differs, places circled string numbers above the stave for all four notes including low notes
- Verovio: differs, omits `<string>` numbers on a standard notation stave
- OSMD: differs, draws Roman numerals above the stave for all four notes

### Checks

1. Are the string numbers enclosed in circles, placed below the stave for low notes (`A3`, `D4`) and above the stave for high notes (`B4`, `E5`)?
   Crop: measure 2, 4 above, 5 below
   Book: p. 373, 0.35 0.55 0.38 0.08
