### The rule

A stem runs 3½ stave-spaces, an octave, from the centre of its notehead (Behind Bars p. 14). An even stem length keeps a line of notes reading as one shape, so the eye follows the noteheads rather than the stems.

### The test case

`stem-length.musicxml`: a treble stave in 4/4 that leaves every `<stem>` unset, so vexml picks each stem's direction and length. Measure 1 holds C5 D5 E5 F5, on and above the middle line, so their stems go down; measure 2 holds A4 G4 E4 C4, below it, so their stems go up. Between them they cover both directions, notes in spaces and on lines, and the ledger-line C4.

### What to look for

Each stem is drawn with its measured length beside it, in stave-spaces, from the centre of its notehead to its tip. Every one should read 3½.
