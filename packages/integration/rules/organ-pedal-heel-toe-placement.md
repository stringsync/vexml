### The rule

Place right-foot organ pedal heel (`u`) and toe (`^`) markings above the stave and left-foot markings below the stave, keeping the symbols upright (not inverted) when placed below the stave. See Behind Bars pp. 347–348.

### The test case

`organ-pedal-markings.musicxml` places `<toe placement="above"/>` and `<heel placement="above"/>` on measure 1 (right foot) and `<toe placement="below"/>` and `<heel placement="below"/>` on measure 2 (left foot) in bass clef.

- Measure 1. Right-foot toe (`^`) and heel (`u`) markings sit above the stave.
- Measure 2. Left-foot toe (`^`) and heel (`u`) markings sit below the stave, keeping the same upright orientation without inverting.

### Renderers

- Behind Bars: agrees, places right-foot heel and toe above and left-foot heel and toe below without inverting the symbols
- MuseScore: agrees, places right-foot toe and heel above the stave and left-foot marks below without inverting the symbols
- Verovio: differs, omits `<heel>` and `<toe>` technical markings
- OSMD: differs, omits `<heel>` and `<toe>` technical markings

### Checks

1. Do the right-foot toe and heel markings sit above the stave in measure 1 and the left-foot toe and heel markings sit below the stave in measure 2 without inverting the glyphs?
   Crop: measure 1, 4 above, 4 below
   Book: p. 348, 0.08 0.21 0.78 0.09
