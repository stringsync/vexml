### The rule

When a ledger-line note's articulation falls between it and the stave, put it no closer to the note than the outermost stave-space. See Behind Bars p. 120.

### The test case

`articulation.musicxml` isolates each rule by measure.

- Measure 5. A high ledger-line note with an up-stem and a low one with a down-stem, each with staccato between the head and the stave.

### Renderers

- Behind Bars: agrees, puts the dots inside the stave's outermost spaces
- MuseScore: agrees, puts the dots inside the stave
- Verovio: agrees, puts the dots inside the stave
- OSMD: differs, leaves the dots in the gap beside the ledger lines

### Checks

1. Is each dot inside the stave, in its outermost space, rather than in the gap by the ledger lines?
   Crop: measure 5, 4 above, 6 below
