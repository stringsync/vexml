### The rule

For tenor vocal parts written in treble clef sounding an octave lower than written, draw a treble clef with a small `8` centred beneath its tail. See Behind Bars p. 433.

### The test case

`vocal-tenor-clef.musicxml` opens a vocal part with a G clef on line 2 carrying `<clef-octave-change>-1</clef-octave-change>`.

- Measure 1. Tenor octave-down treble clef followed by four quarter notes with lyrics.

### Renderers

- Behind Bars: agrees, draws a treble clef with a small `8` centred beneath its tail
- MuseScore: agrees, draws a treble clef with a small `8` centred beneath its tail
- Verovio: agrees, draws a treble clef with a small `8` centred beneath its tail
- OSMD: agrees, draws a treble clef with a small `8` centred beneath its tail

### Checks

1. Does the opening clef in measure 1 display a small `8` centred beneath the tail of the treble clef?
   Crop: measure 1, 3 above, 5 below
   Book: p. 433, 0.245 0.772 0.145 0.055
