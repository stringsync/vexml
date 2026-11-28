### The rule

When beaming chords, the note closest to the beam on each stem determines the beam's angle (Behind Bars p. 24). Anchoring the angle to the nearest noteheads keeps chord stems balanced and reflects the contour directly adjacent to the beam.

### The test case

`beams.musicxml`: measure 19 holds two up-stem beamed chord pairs (C4-E4-A4 to F4-A4 with level top notes A4 to A4, expected flat; and E4-G4 to C4-A4 with rising top notes G4 to A4, expected rising), checking each beam's slope direction.

### What to look for

In measure 19, a green box on the first chord pair confirms its beam is `flat`, while a red box on the second pair reports `flat` where the rising top notes G4→A4 call for a rising beam (`rises`).
