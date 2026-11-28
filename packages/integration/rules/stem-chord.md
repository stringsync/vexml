### The rule

A chord's stem length is measured from the notehead closest to the stem's free end, using the same length that note would take alone: 3½ stave-spaces inside the stave, or extending to the middle line on multiple ledger lines (Behind Bars p. 15).

### The test case

`stems.musicxml`: measure 6 contains four quarter chords (C4-E4-G4, D5-F5-A5, C6-E6 on two or more ledger lines, and A3-C4) with `<stem>` unset.

### What to look for

In measure 6, green brackets measure from each chord's innermost notehead toward the free end: `3½` for the three in-stave or single-ledger chords, and `0` spaces from the blue middle line for the high C6-E6 chord.
