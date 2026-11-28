### The rule

On a five-line stave, a percussion clef sits in the middle two stave-spaces; on a stave with fewer lines, it centres on the stave (Behind Bars p. 6). Consistent centring marks the stave as unpitched without colliding with outer lines or ledger space.

### The test case

`clef-percussion.musicxml`: two parts in 4/4, each opening with a percussion clef and four quarter notes: part 1 on a standard five-line stave and part 2 on a single-line stave.

### What to look for

On part 1, blue lines mark the fourth and second stave-lines bounding the middle two spaces; the boxed percussion clef should sit within them with a `0` centre offset. On part 2, the blue line marks the single stave-line and the boxed percussion clef should centre on it with a `0` offset.
