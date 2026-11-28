### The rule

Overriding the lower-part-right rule in three-voice writing, when one of two same-direction parts has a flag or beam, move the flagged or beamed part to the right so flags and beams do not collide with the other stem. See Behind Bars p. 313.

### The test case

`keyboard-three-voices.musicxml` gives each three-voice rule its own measure.

- Measure 2. Single treble stave in 4/4 with three voices: voice 1 up-stem half notes E5 and D5, voice 2 down-stem beamed eighth notes B4, A4, G4, A4 and B4, A4, G4, F4, and voice 3 down-stem plain half notes E4 and D4.

### Renderers

- Behind Bars: agrees, moves the beamed down-stem voice (voice 2) to the right of the un-beamed lower down-stem voice (voice 3) so the beam clears the stem
- MuseScore: differs, stacks the beamed middle voice and un-beamed lower voice vertically on the same column
- Verovio: differs, stacks the beamed middle voice and un-beamed lower voice vertically on the same column
- OSMD: agrees, moves the beamed down-stem voice (voice 2) to the right of the un-beamed lower down-stem voice (voice 3)

### Checks

1. Does the beamed down-stem middle voice (voice 2) sit to the right of the un-beamed lower voice (voice 3) on each shared beat so its beam clears voice 3’s stem?
   Crop: measure 2, 2 above, 3 below
   Book: p. 313, 0.22 0.67 0.54 0.08
