# dot-chord-distinct-spaces

### The rule

Use a different stave-space row for each dot in an ordinary chord, including through implied ledger spaces, so the dots cannot read as a multiplied duration. See Behind Bars p. 55.

### The test case

`duration-dots.musicxml` uses one attack per measure to isolate the dot placement.

- Measure 9. Adjacent-note ledger chord.
- Measure 10. Four consecutive notes in a single chord.

### Checks

1. Are the three ledger-chord dots in distinct implied spaces?
   Crop: measure 9, 7 spaces, 3 above, 5 below
2. Are the four dots at separate heights in one column?
   Crop: measure 10, 7 spaces, 3 above, 3 below
