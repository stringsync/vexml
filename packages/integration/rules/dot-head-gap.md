# dot-head-gap

### The rule

Keep a duration dot close to its head, with a typical clear gap of half a stave space. See Behind Bars p. 54.

### The test case

`duration-dots.musicxml` uses one attack per measure to isolate the dot placement.

- Measure 1. Single dotted space note with a staccato comparison.
- Measure 2. Single dotted line note.

### Checks

1. Is the gap from the head to its dot roughly half a stave space?
   Crop: measure 1, from 6.5 spaces, 7 spaces, 3 above, 3 below
2. Does the line note leave roughly the same head-to-dot gap?
   Crop: measure 2, 7 spaces, 3 above, 3 below
