### The rule

When left-hand fingering (`1` to `4`, `0`), right-hand fingering (`p`, `i`, `m`, `a`), and string numbers combine on one note, place left-hand fingering closest to the notehead, right-hand fingering outside it, and the circled string number outermost. See Behind Bars p. 375.

### The test case

`guitar-fingering.musicxml` isolates combined fingering and string-number stacking in measure 6.

- Measure 6. Three notes (written `C5`, `D5`, `E5`), each carrying `<fingering>` (`1`, `3`, `0`), `<pluck>` (`i`, `m`, `a`), and `<string>` (`2`, `2`, `1`), unmarked placement.

### Renderers

- Behind Bars: agrees, places left-hand numerals closest to the notehead, right-hand letters outside them, and circled string numbers outermost
- MuseScore: agrees, stacks left-hand numerals nearest the note, italic right-hand letters above them, and circled string numbers outermost
- Verovio: differs, draws only the left-hand numerals and omits `<pluck>` and `<string>`
- OSMD: differs, omits `<pluck>` and places Roman string numerals below the left-hand numerals

### Checks

1. On each note in measure 6, does the left-hand numeral sit closest to the note, the right-hand letter outside it, and the circled string number outermost (not merged on one line)?
   Crop: measure 6, 7 above, 3 below
   Book: p. 375, 0.14 0.75 0.34 0.12
