### The rule

Notate two simultaneous strings of the same pitch with two unison noteheads, marking the open string with `0` and the stopped string with its string number. See Behind Bars p. 380.

### The test case

`guitar-techniques.musicxml` isolates simultaneous same-pitch strings in measure 5.

- Measure 5. Two half-note unison chords (`B4`+`B4` with string `3` and open `0`; `E5`+`E5` with string `2` and open `0`).

### Renderers

- Behind Bars: agrees, draws two side-by-side unison noteheads with clear open-string `0` and string number
- MuseScore: agrees, draws two side-by-side unison noteheads with `0` and circled string number above
- Verovio: differs, draws two side-by-side unison noteheads with `0` but omits `<string>` numbers
- OSMD: agrees, draws two side-by-side unison noteheads with `0` above and Roman string numeral beside

### Checks

1. Does each unison in measure 5 draw two distinct side-by-side noteheads with clear `0` and circled string number?
   Crop: measure 5, 5 above, 3 below
   Book: p. 380, 0.40 0.51 0.19 0.08
