### The rule

In a chord containing an octave pair of accidentals alongside another accidental, align the octave accidentals in one column and offset the other accidental to the left so the octave reads at a glance. See Behind Bars p. 90.

### The test case

`accidentals-voices.musicxml` isolates each case in its own measure.

- Measure 1. Two half-note chords: F#4, G#4, F#5 and E♭4, B♭4, E♭5.

### Renderers

- Behind Bars: agrees, aligns octave accidentals and offsets the inner accidental left even when adjacent to the lower note
- MuseScore: differs, aligns G#4 with F#5 and offsets F#4 left on the first chord, while aligning the Eb4/Eb5 octave on the second
- Verovio: differs, aligns G#4 with F#5 and offsets F#4 left on the first chord, while aligning the Eb4/Eb5 octave on the second
- OSMD: differs, aligns G#4 with F#5 and offsets F#4 left on the first chord, while aligning the Eb4/Eb5 octave on the second

### Checks

1. In both chords, do the octave accidentals align in the column nearest the heads with the inner accidental offset to the left?
   Crop: measure 1, 4 above, 3 below
   Book: p. 90, 0.37 0.17 0.25 0.06
