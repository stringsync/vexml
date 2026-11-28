### The rule

A note on the middle stave line continues the stem direction of its surrounding notes or beat; when there is no contextual cue, it takes a down-stem (Behind Bars pp. 13–14). Following neighbouring stems preserves visual flow across a phrase.

### The test case

`stems.musicxml`: measure 3 places a middle-line B4 between up-stemmed neighbours (G4, A4, B4, A4), measure 4 repeats four isolated B4 quarters, measure 9 places B4 between opposing neighbours in an up-stemmed first half-bar (G4, B4, C5, D5), and measure 10 places B4 between opposing neighbours in a mixed half-bar (G4 eighth, D5 eighth, B4 quarter, A4 half), all with `<stem>` unset.

### What to look for

In measure 3, the third note (B4) stems `up` to match its neighbours; in measure 4, all four isolated B4 notes stem `down`; in measure 9, B4 stems `up` with its half-bar; in measure 10, B4 stems `down` when neither neighbours nor half-bar agree.
