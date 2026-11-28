### The rule

On a down-stemmed chord with a displaced notehead on the left of the stem, tuck an accidental closer to the stem than the displaced note wherever there is vertical room, including octave accidentals. See Behind Bars p. 90.

### The test case

`accidentals-voices.musicxml` isolates each case in its own measure.

- Measure 4. Two down-stemmed half-note chords: F#4, E5, F#5 (E5 displaced left of the stem) and B4, C5, F♭5 (B4 displaced left of the stem).

### Renderers

- Behind Bars: agrees, tucks accidentals closer to the down-stem than the displaced notehead wherever clear
- MuseScore: agrees, tucks Fb5 directly over displaced B4 close to the down-stem on the second chord
- Verovio: agrees, tucks Fb5 directly over displaced B4 close to the down-stem on the second chord
- OSMD: differs, leaves Fb5 completely to the left of displaced B4 with no tucking

### Checks

1. In both down-stemmed chords, do the clear accidentals tuck closer to the stem than the displaced notehead?
   Crop: measure 4, 4 above, 3 below
   Book: p. 90, 0.41 0.69 0.20 0.065
