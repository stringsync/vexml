# dot-unison-one-stem

### The rule

Give the heads of a same-stem unison one dot apiece on different space rows. See Behind Bars p. 58.

### The test case

`duration-dots.musicxml` uses one attack per measure to isolate the dot placement.

- Measure 22. Same-stem perfect unison on a line.
- Measure 32. Stemless same-voice unison in a space.

### Checks

1. Does each stemmed unison head have a dot on a different space row?
   Crop: measure 22, from 2.5 spaces, 7 spaces, 3 above, 3 below
2. Does each stemless unison head have a dot on a different space row?
   Crop: measure 32, 9 spaces, 3 above, 3 below
