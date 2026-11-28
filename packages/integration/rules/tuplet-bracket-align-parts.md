### The rule

Align tuplet bracket ends vertically between parts sharing the same tuplet division. See Behind Bars p. 196.

### The test case

`tuplets-parts.musicxml` places simultaneous unbeamed quarter triplets on two staves in measure 1.

- Measure 1. Upper stave: G4, A4, B4 quarter triplet. Lower stave: C3, D3, E3 quarter triplet.

### Renderers

- Behind Bars: agrees, aligns the left and right bracket ends vertically between the two staves
- MuseScore: agrees, aligns the left and right bracket ends vertically between the two staves
- Verovio: agrees, aligns the left and right bracket ends vertically between the two staves
- OSMD: agrees, aligns the left and right bracket ends vertically between the two staves

### Checks

1. In measure 1, do the left and right ends of the upper and lower tuplet brackets align vertically?
   Crop: measure 1, 3 above, 15 below
   Book: p. 196, 0.36 0.17 0.27 0.08
