### The rule

In passages requiring many ledger lines, the tuplet indication may be placed on the notehead side to avoid a large distance between the noteheads and the stem ends. See Behind Bars p. 198.

### Why a person decides

Behind Bars states this as an optional exception ("may be best placed on the notehead side") rather than a mandatory default, and digital engravers differ on whether they flip high ledger-line tuplets to the notehead side.

### The test case

`tuplets-placement.musicxml` places a high ledger-line unbeamed triplet in measure 3.

- Measure 3. Unbeamed 3:2 quarter triplet on E6, F6, E6 (four ledger lines above treble stave).

### Renderers

- Behind Bars: agrees, places the bracket on the notehead side above the high ledger-line notes
- MuseScore: differs, keeps the bracket on the stem side below the stave
- Verovio: differs, keeps the bracket on the stem side below the stave
- OSMD: agrees, places the bracket on the notehead side above the high ledger-line notes

### Checks

1. In measure 3, is the triplet bracket placed cleanly on the notehead side (above) or stem side (below) of the high ledger-line notes?
   Crop: measure 3, 6 above, 3 below
   Book: p. 198, 0.37 0.17 0.26 0.08
