### The rule

In a close-position chord of three or more notes, order accidentals by stave position, not by kind: the highest nearest the chord, then the lowest, then alternate the highest and lowest of the rest, which packs tighter than descending order. See Behind Bars pp. 87 and 89.

### The test case

`accidentals.musicxml` gives each case its own measure.

- Measure 15. F#4, A#4, C#5 half-note chord, then G#4, B♭4, D♮5 half-note chord.

### Renderers

- Behind Bars: agrees, highest nearest, then lowest, alternating
- MuseScore: agrees, highest, lowest, then middle in both chords
- Verovio: agrees, highest, lowest, then middle in both chords
- OSMD: agrees, highest, lowest, then middle in both chords

### Checks

1. Reading leftwards from the heads, does each chord's accidentals run highest, lowest, then middle?
   Crop: measure 15, 4 above, 3 below
   Book: p. 89, 0.39 0.26 0.23 0.065
