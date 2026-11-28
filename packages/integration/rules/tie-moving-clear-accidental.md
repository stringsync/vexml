### The rule

Curve a tie away from an added note carrying an accidental so that the tie and accidental do not collide. See Behind Bars p. 71.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 20. A4 C5 half tied on A4 to F#4 A4 half, with a sharp on the added F#4 below.

### Renderers

- Behind Bars: agrees, A4 tie curves up clear of the F#4 sharp
- MuseScore: differs, A4 tie curves down and stops before the sharp
- Verovio: differs, A4 tie curves down and cuts into the sharp
- OSMD: differs, A4 tie curves down and cuts into the sharp

### Checks

1. Does A4’s tie curve up, staying clear of the sharp on F#4?
   Crop: measure 20, 4 above, 4 below
