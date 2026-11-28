### The rule

When a half or whole rest is moved outside the stave, it sits on or hangs from a ledger line so its duration remains unambiguous (Behind Bars p. 37). Without a ledger line, a floating bar rest cannot be distinguished as a whole or half rest.

### The test case

`rests-voices.musicxml`: measure 7 places a V1 half rest above a V2 A5 half note, forcing the rest outside the stave above the top line, and checks both that it clears the top line and that a ledger line is drawn beneath it.

### What to look for

In measure 7, a green box (`ledger`) above the blue top stave line confirms V1's raised half rest sits outside the stave on its own ledger line.
