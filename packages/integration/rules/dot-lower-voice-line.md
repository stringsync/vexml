# dot-lower-voice-line

### The rule

Put a lower voice’s dot below its line note in ordinary two-voice writing. See Behind Bars p. 56.

### The test case

`duration-dots.musicxml` uses one attack per measure to isolate the dot placement.

- Measure 12. Two dotted parts with a line note below.
- Measure 33. Lower-voice line notes dotted under an upper-voice attack, then under an upper-voice rest.
- Measure 34. A dotted lower-voice line note attacked while the upper voice holds a whole note.
- Measure 35. A dotted lower-voice chord of line notes a third apart.
- Measures 26 and 28. A dotted lower-voice line note in a separated unison.

### Checks

1. Is the lower voice’s dot centred in the space below its head?
   Crop: measure 12, from 2.5 spaces, 7 spaces, 3 above, 3 below
2. Do the lower voice's dots stay below their heads when the upper voice rests?
   Crop: measure 33, 24 spaces, 3 above, 3 below
3. Does the lower voice's dot stay below its head while the upper voice sustains?
   Crop: measure 34, 12 spaces, 3 above, 3 below
4. Is each dot of the lower chord in the space below its own head?
   Crop: measure 35, 7 spaces, 3 above, 3 below
5. Is the lower voice's dot below its head in each separated unison?
   Crop: measure 28, 7 spaces, 3 above, 3 below
