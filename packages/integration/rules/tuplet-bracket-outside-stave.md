### The rule

Always place a tuplet bracket outside the stave; the bracket ends and edge of the numeral may intersect an outer stave line, but the bracket must never sit inside the stave. See Behind Bars p. 199.

### The test case

`tuplets-placement.musicxml` places low up-stem and high down-stem unbeamed triplets whose stem tips end inside the stave.

- Measure 7. Beat 1: A3, B3, C4 unbeamed eighth triplet (up-stems ending inside stave). Beat 2: A5, B5, C6 unbeamed eighth triplet (down-stems ending inside stave).

### Renderers

- Behind Bars: agrees, keeps both brackets outside the stave rather than inside the stave lines
- MuseScore: agrees, keeps both brackets outside the stave lines
- Verovio: agrees, keeps both brackets outside the stave lines
- OSMD: agrees, keeps both brackets outside the stave lines (placing both above)

### Checks

1. In measure 7, do both tuplet brackets stay outside the stave lines rather than sitting inside the stave?
   Crop: measure 7, 4 above, 4 below
   Book: p. 199, 0.36 0.425 0.18 0.05
