### The rule

Join choir staves with a square margin bracket while leaving solo vocal staves above the chorus unbracketed. See Behind Bars pp. 462–464.

### The test case

`choral-four-stave.musicxml` renders a three-part vocal score with an unbracketed Solo Soprano stave above a bracketed Soprano and Alto choir group (`<group-symbol>bracket</group-symbol>`).

- Measure 1. Left margin shows the unbracketed Solo Soprano stave above the square-bracketed Soprano and Alto choir staves.

### Renderers

- Behind Bars: agrees, leaves soloist staves unbracketed above the square-bracketed choir staves
- MuseScore: agrees, joins Soprano and Alto with a square bracket while leaving Solo Soprano unbracketed above
- Verovio: agrees, joins Soprano and Alto with a square bracket while leaving Solo Soprano unbracketed above
- OSMD: agrees, joins Soprano and Alto with a square bracket while leaving Solo Soprano unbracketed above

### Checks

1. Does a square margin bracket join the Soprano and Alto choir staves while leaving the Solo Soprano stave above unbracketed?
   Crop: measure 1, part 2, 12 above, 14 below
   Book: p. 463, 0.65 0.14 0.30 0.46
