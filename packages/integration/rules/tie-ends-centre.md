### The rule

With room to spare and no articulation, start and end a tie at the centres of its heads. Ends at the centres show which heads the tie joins. See Behind Bars p. 62.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 1. Two A4 half notes tied, with plenty of room.

### Renderers

- Behind Bars: agrees, ends at the heads' centres
- MuseScore: agrees, ends under the heads' centres
- Verovio: differs, ends after the first head and before the second
- OSMD: differs, ends at the heads' inner edges

### Checks

1. Do the tie’s ends sit between each head’s middle and its inner edge?
   Crop: measure 1, 3 above, 4 below

### Why a person decides

Gould lets the ends move with the surrounding notation (centre, edge, or just inside the heads), so which treatment counts as the default is a choice. The user chose ends between the centre and the inner edge (decisions.md, 2026-11-26).
