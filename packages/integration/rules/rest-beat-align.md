### The rule

Rests that belong to the same beat should align horizontally at the same displaced level rather than stepping up and down independently (Behind Bars p. 37). Consistent vertical alignment lets the player read the beat as a single rhythmic unit.

### The test case

`rests-voices.musicxml`: measure 4 sets a V1 sixteenth note followed by a sixteenth rest and an eighth rest (completing beat 1) over a V2 whole note, checking that all rests in V1 share the same vertical displacement from their measure 6 home positions.

### What to look for

In measure 4, green boxes over V1's sixteenth and eighth rests both read `-1`, confirming they shift together by the same whole-space offset.
