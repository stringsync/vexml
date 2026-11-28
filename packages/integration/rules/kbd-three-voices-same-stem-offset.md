### The rule

When three parts share a stave and two have stems in the same direction, displace the lower same-direction part to the right, overlapping noteheads vertically where possible. See Behind Bars p. 313.

### The test case

`keyboard-three-voices.musicxml` gives each three-voice rule its own measure.

- Measure 1. Single treble stave in 4/4 with three voices: voice 1 up-stem half notes E5 and D5, voice 2 down-stem half notes B4 and A4, and voice 3 down-stem half notes G4 and F4.

### Renderers

- Behind Bars: agrees, displaces the lower down-stem voice (voice 3) to the right of the higher down-stem voice (voice 2)
- MuseScore: differs, stacks both down-stem voices vertically on the same column
- Verovio: agrees, displaces the lower down-stem voice (G4, F4) slightly to the right of the higher down-stem voice (B4, A4)
- OSMD: differs, displaces the higher down-stem voice (B4, A4) to the right instead of the lower voice

### Checks

1. Is the lower down-stem voice (G4, F4) displaced to the right of the higher down-stem voice (B4, A4) with clear, non-colliding stems?
   Crop: measure 1, 2 above, 3 below
   Book: p. 313, 0.15 0.55 0.39 0.07
