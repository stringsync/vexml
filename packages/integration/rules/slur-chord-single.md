### The rule

Give all the notes on one stem a single slur, not one per note. See Behind Bars p. 114.

### The test case

`slurs-structure.musicxml` isolates each rule by measure.

- Measure 4. A slur between two three-note chords.

### Renderers

- Behind Bars: agrees, one slur per chord pair
- MuseScore: agrees, one slur above the chords
- Verovio: agrees, one slur below on the stem side
- OSMD: agrees, one slur above the chords

### Checks

1. Is there one slur between the chords, not one per note?
   Crop: measure 4, 3 above, 6 below
