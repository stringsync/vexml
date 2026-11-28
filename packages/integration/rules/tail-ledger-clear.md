### The rule

On ledger-line notes, Behind Bars p. 16 extends stems so tails stay off ledger lines and the outer stave line. By user decision (see `ledger/decisions.md`), vexml instead keeps ledger-line 8th and 16th stems at the middle line, and extends 32nd+ past the middle line by the extra-flag increment, avoiding awkward over-long stems with Bravura's tall flag glyphs.

### The test case

`tails.musicxml`: measure 3 places C6 (16th), E6 (32nd), A3 (16th), and F3 (32nd) on ledger lines above and below the treble stave, separated by rests.

### What to look for

In measure 3, a blue line marks the middle stave line; green brackets on C6 and A3 (16ths) stop at the middle line (`0` past middle), and E6 and F3 (32nds) extend `¾` space past the middle line.
