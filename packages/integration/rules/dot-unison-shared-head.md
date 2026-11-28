# dot-unison-shared-head

### The rule

Show one visible duration dot when two equally dotted voices share the same head at unison. See Behind Bars p. 58.

### The test case

`duration-dots.musicxml` uses one attack per measure to isolate the dot placement.

- Measure 24. Two dotted stemmed notes in unison.

### Checks

1. Do the two stems share a head and a single visible dot?
   Crop: measure 24, 7 spaces, 3 above, 3 below
