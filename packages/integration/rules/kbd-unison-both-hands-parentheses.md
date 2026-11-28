### The rule

When the same written pitch appears simultaneously for both hands on opposite staves, enclose the secondary notehead in parentheses so the player knows to play it with one hand. See Behind Bars p. 308.

### The test case

`keyboard-system.musicxml` gives each keyboard system rule its own measure(s).

- Measure 2. Staff 1 plays beamed eighth notes E4, F4, E4, D4, (C4), D4, E4, F4 with `parentheses="yes"` on the C4 notehead; staff 2 plays a half rest followed by a half note C4.

### Renderers

- Behind Bars: agrees, draws round parentheses tightly around the secondary C4 notehead
- MuseScore: agrees, draws round parentheses around the secondary C4 notehead
- Verovio: agrees, draws round parentheses around the secondary C4 notehead
- OSMD: differs, omits the parentheses around the C4 notehead

### Checks

1. Are parentheses drawn cleanly around the upper-stave C4 notehead without colliding with adjacent noteheads or the ledger line?
   Crop: measure 2, 2 above, 2 below
   Book: p. 308, 0.36 0.38 0.28 0.09
