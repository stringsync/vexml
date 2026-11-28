# dot-crossed-stem-clearance

### The rule

When crossed parts have just one dotted value, keep the other voice’s stem out of the gap from the dotted head to its dot. See Behind Bars p. 57.

### The test case

`duration-dots.musicxml` uses one attack per measure to isolate the dot placement.

- Measure 17. Crossed parts a third apart, the lower part dotted.
- Measure 36. Crossed parts a fourth apart, the lower part dotted.
- Measure 37. Crossed parts a third apart, the upper part dotted.

### Checks

1. Is there a clear path from the dotted head to the dot without a stem in between?
   Crop: measure 17, from 2.5 spaces, 7 spaces, 3 above, 3 below
2. Is there a clear path from the dotted head to the dot without a stem in between at a crossed fourth?
   Crop: measure 36, 7 spaces, 3 above, 3 below
3. Is there a clear path from the upper dotted head to its dot, with the lower part's stem to the right of the dot?
   Crop: measure 37, 7 spaces, 3 above, 3 below
