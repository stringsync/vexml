### The rule

In a chord containing a second on ledger lines, ledgers between the stave and the adjacent pair extend across both noteheads; the outermost ledger line stays single-head wide when the displaced note sits in a space, and spans both noteheads when the displaced note sits on a line (Behind Bars p. 27). Matching the final ledger's width to whether the displaced note rests on a line keeps the chord's shape clear without extra ink.

### The test case

`ledgers.musicxml`: measure 4 has two down-stemmed half-note second chords above the treble stave: C6-D6 (displaced C6 on a line, so both A5 and C6 should span both heads) and B5-C6 (displaced B5 in a space, so A5 should span both heads and C6 one head).

### What to look for

In measure 4, green boxes mark C6-D6's A5 and C6 ledgers at `2×` (spanning both heads), and B5-C6's A5 ledger at `2×` and C6 ledger at `1×` (single-head width under C6).
