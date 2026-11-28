# dot-multiple-spacing

### The rule

Keep successive dots on one note close together and evenly spaced. See Behind Bars p. 54.

### The test case

`duration-dots.musicxml` uses one attack per measure to isolate the dot placement.

- Measure 4. Triple-dotted note.
- Measure 31. Double-dotted note.

### Checks

1. Do the three dots form an evenly spaced, compact row?
   Crop: measure 4, 7 spaces, 3 above, 3 below
2. Are the two dots close together on the same row?
   Crop: measure 31, 7 spaces, 3 above, 3 below
