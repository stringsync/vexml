### The rule

A feathered (fanned) beam indicates a free accelerando or rallentando by using two or three beams at its fastest end and converging to a single beam at its slowest end. See Behind Bars p. 158.

### The test case

`metre-time.musicxml` measure 6 pairs two four-note feathered-beam groups of 32nd notes: the first slows down (`fan="rit"`) and the second speeds up (`fan="accel"`).

- Measure 6. Beat 1 has `fan="rit"` (wide at left, converging at right); beat 2 has `fan="accel"` (converging at left, wide at right).

### Renderers

- Behind Bars: agrees, spreads multiple beams at the fast end and converges them to one beam at the slow end
- MuseScore: differs, ignores the fan attribute and draws parallel 32nd beams
- Verovio: differs, ignores the fan attribute and draws parallel 32nd beams
- OSMD: differs, ignores the fan attribute and draws parallel 32nd beams

### Checks

1. Does the first group start with three separated beams on the left and converge to one beam on the right, and the second group do the reverse?
   Crop: measure 6, 3 above, 3 below
   Book: p. 158, 0.09 0.52 0.78 0.05
