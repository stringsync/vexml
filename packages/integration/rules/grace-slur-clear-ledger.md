### The rule

Keep a grace-note slur from obscuring a ledger line; placing the slur above ledger-line notes is often preferable to colliding with the ledger lines. See Behind Bars p. 129.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 10. A three-note grace group on high ledger lines (`C6-D6-E6`) slurred to `C6` with no `placement` set.

### Renderers

- Behind Bars: agrees, places the slur clear of the ledger lines (above the notes)
- MuseScore: differs, curves the slur below across the C6 ledger line
- Verovio: differs, curves the slur below right beneath the C6 ledger line
- OSMD: differs, curves the slur below right across the C6 ledger line

### Checks

1. Does the grace-note slur in measure 10 stay clear of the ledger lines rather than cutting through them?
   Crop: measure 10, 6 above, 3 below
   Book: p. 129, 0.17 0.84 0.66 0.06
