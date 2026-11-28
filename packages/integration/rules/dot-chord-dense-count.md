# dot-chord-dense-count

### The rule

For a tightly packed chord whose full dot column would extend two stave spaces past a head, use the dot rows that cover the chord’s span. See Behind Bars p. 56.

### The test case

`duration-dots.musicxml` uses one attack per measure to isolate the dot placement.

- Measure 11. Eight consecutive notes in a single chord.

### Checks

1. Does the packed chord have one visible dot per space in its span?
   Crop: measure 11, 7 spaces, 3 above, 3 below
