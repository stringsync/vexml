### The rule

Notate an artificial harmonic with the stopped fundamental as an ordinary notehead and the touched pitch above it as a hollow diamond on the same stem, both taking duration dots and ties, with no harmonic circle above. See Behind Bars p. 420.

### The test case

`strings-pizz-harmonics.musicxml` pairs `<harmonic><artificial/><base-pitch/></harmonic>` on the lower note with `<harmonic><artificial/><touching-pitch/></harmonic>` on the upper `<chord/>` note.

- Measure 10. A quarter artificial harmonic (G4 + C5) followed by a dotted-quarter artificial harmonic (A4 + D5) tied to an eighth artificial harmonic (A4 + D5), then a quarter rest.

### Renderers

- Behind Bars: agrees, draws a filled stopped head with a hollow diamond above on one stem, with dots and ties on both notes and no circle
- MuseScore: differs, fills the quarter and eighth diamond noteheads black instead of keeping them hollow (draws dots, ties, and no circle)
- Verovio: differs, fills the quarter and eighth diamond noteheads black and stacks two harmonic circles above each chord
- OSMD: differs, fills the quarter and eighth diamond noteheads black and adds a `0` mark to each chord

### Checks

1. In measure 10, does every artificial harmonic pair an ordinary stopped head with a hollow diamond on the same stem, with duration dots and ties on both notes and no harmonic circle?
   Crop: measure 10, 4 above, 3 below
   Book: p. 420, 0.22 0.73 0.56 0.08
