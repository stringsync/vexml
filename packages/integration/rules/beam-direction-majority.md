### The rule

When a beamed group has unequal numbers of notes on either side of the middle stave line, the majority sets the stem direction unless a minority note lies much further from the middle line and would force overly long stems (Behind Bars p. 24). This balances normal inward stems against extreme outliers.

### The test case

`beams.musicxml`: measure 21 holds two four-note eighth groups with three notes below and one above the middle line (A4-C5-A4-G4, majority below; and G4-C6-A4-G4, outlier C6 far above), with `<stem>` left unset.

### What to look for

In measure 21, the blue line marks the middle stave line; green boxes around the two beams read `up` for the majority-below group and `down` for the C6 outlier group.

### Checks

1. With three of its four notes below the middle line, do the first group's stems point up?
   Crop: measure 21, 13 spaces, 4 above, 3 below
   Book: p. 24, 0.270 0.540 0.140 0.055
2. Does the second group, pulled by its high C6, point its stems down?
   Crop: measure 21, from 12 spaces, 5 above, 4 below
   Book: p. 24, 0.225 0.675 0.240 0.070

### Why a person decides

Gould gives no figure for "much further" from the middle line; the check picks a threshold, and where it sits is a matter of taste.
