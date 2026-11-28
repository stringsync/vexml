### The rule

Never allow a tie to pass between or intersect another part’s ledger lines; move the tie clear of the ledger lines while keeping it reasonably flat rather than deeply rounded like a slur. See Behind Bars p. 68.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 8. Voice 1 ties A5 half to A5 half while voice 2 plays C6 E6 C6 on ledger lines above it.

### Renderers

- Behind Bars: agrees, keeps A5’s tie clear of the other part’s ledger lines
- MuseScore: differs, A5’s tie arches through E6’s ledger lines and head
- Verovio: differs, A5’s tie passes between E6’s ledger lines
- OSMD: differs, A5’s tie passes between E6’s ledger lines

### Checks

1. Does A5’s tie stay clear of C6 and E6’s ledger lines?
   Crop: measure 8, 6 above, 3 below
