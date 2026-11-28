# dot-chord-line-side

### The rule

In a dotted second, move an upper line note’s dot up and a lower line note’s dot down to keep them clear of the adjacent head. See Behind Bars p. 55.

### The test case

`duration-dots.musicxml` uses one attack per measure to isolate the dot placement.

- Measure 7. Second with an upper line note.
- Measure 8. Second with a lower line note.

### Checks

1. Is the dot for the upper line note in the space above it?
   Crop: measure 7, 7 spaces, 3 above, 3 below
2. Is the dot for the lower line note in the space below it?
   Crop: measure 8, 7 spaces, 3 above, 3 below
