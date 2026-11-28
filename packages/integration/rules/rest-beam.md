### The rule

When a beam joins notes across a rest, the beam keeps its normal position and the rest moves away from the stave centre if needed to clear the beam (Behind Bars p. 36). Repositioning the rest avoids stretching surrounding stems awkwardly far from their noteheads.

### The test case

`rests.musicxml`: measure 7 beams eighth notes (C4 and A3) across an eighth rest and sixteenth notes (A3 and A3) across a sixteenth rest, counting overlapping pixels between rest ink and beam ink.

### What to look for

In measure 7, red boxes over the beamed eighth rest (`23px`) and sixteenth rest (`46px`) mark ink collisions where both rests stay centred and cut straight through the beams.
