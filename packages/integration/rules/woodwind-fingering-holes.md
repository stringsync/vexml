### The rule

Place standard woodwind fingering hole symbols (open circle `○`, closed circle `●`, and half-open circle `◐`) directly above or below the relevant note. See Behind Bars p. 258.

### The test case

`woodwind.musicxml` measure 5 places open, closed, and half-open `<hole>` symbols above the first three quarter notes (default placement) and a half-open symbol below the fourth note.

- Measure 5. Four quarter notes on B4 carrying `<hole-closed>` values `no`, `yes`, `half` (default above), and `half` (`placement="below"`).

### Renderers

- Behind Bars: agrees, draws open, closed, and half-open circles directly above or below each note
- MuseScore: differs, draws open and closed circles above beats 1–2 but uses a bullseye glyph instead of a half-filled circle for `half`
- Verovio: differs, omits all `<hole>` fingering symbols
- OSMD: differs, omits all `<hole>` fingering symbols

### Checks

1. Do beats 1–3 draw open, closed, and half-open hole circles directly above their notes, and beat 4 a half-open circle directly below its note?
   Crop: measure 5, 5 above, 4 below
   Book: p. 258, 0.40 0.73 0.20 0.08
