### The rule

Notate a woodwind harmonic with a small open circle centred above the sounding pitch while keeping an ordinary notehead. See Behind Bars p. 256.

### The test case

`woodwind.musicxml` measure 2 places `<harmonic><sounding-pitch/></harmonic>` on an up-stem G4, a down-stem E5, a plain E5 marked `ord.`, and a final harmonic E5.

- Measure 2. Four quarter notes (G4, E5, E5 `ord.`, E5), with sounding-pitch harmonics on beats 1, 2, and 4.

### Renderers

- Behind Bars: agrees, draws an ordinary notehead with a small open circle centred above each harmonic note
- MuseScore: agrees, draws ordinary noteheads with small open circles centred above beats 1, 2, and 4
- Verovio: agrees, draws ordinary noteheads with small open circles centred above beats 1, 2, and 4
- OSMD: differs, places the harmonic circle below the notehead on the up-stem G4 instead of above the stave

### Checks

1. Do the harmonic notes on beats 1, 2, and 4 keep ordinary noteheads and carry a small open circle centred above the stave, while beat 3 (`ord.`) has no circle?
   Crop: measure 2, 5 above, 2 below
   Book: p. 256, 0.25 0.76 0.49 0.08
