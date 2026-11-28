### The rule

In an unaccompanied choral piece, draw the rehearsal piano reduction staves smaller than the vocal staves (about three-quarters full size) and give the keyboard part its own tempo marking above its staves. See Behind Bars p. 471.

### The test case

`choral-reduction.musicxml` places a two-staff piano reduction with `<staff-size>75</staff-size>` and its own `Moderato` tempo marking below full-size Soprano and Bass vocal staves.

- Measure 1. Both keyboard staves render noticeably smaller (~75% height) than the vocal staves above, with `Moderato` cleanly placed above the keyboard treble stave.

### Renderers

- Behind Bars: agrees, draws the unaccompanied rehearsal reduction at reduced staff size with its own tempo marking above
- MuseScore: agrees, draws the rehearsal piano staves at 75% size with `Moderato` above the keyboard treble stave
- Verovio: agrees, draws the rehearsal piano staves at 75% size with `Moderato` above the keyboard treble stave
- OSMD: differs, draws the rehearsal piano staves at full size and omits the keyboard `Moderato` marking

### Checks

1. Are the rehearsal piano reduction staves drawn smaller than the vocal staves above, with `Moderato` cleanly above the keyboard staves?
   Crop: measure 1, part 2, 16 above, 22 below
   Book: p. 471, 0.13 0.59 0.80 0.34
