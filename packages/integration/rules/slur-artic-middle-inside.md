### The rule

Put articulation on the middle notes of a slur inside the slur. See Behind Bars p. 122.

### The test case

`articulation.musicxml` isolates each rule by measure.

- Measure 7. A slur over four notes with staccato on the two in the middle.

### Renderers

- Behind Bars: agrees, middle marks inside the slur
- MuseScore: agrees, dots between notes and slur
- Verovio: agrees, dots under the slur
- OSMD: agrees, dots between notes and slur

### Checks

1. Do the middle dots sit between the notes and the slur?
   Crop: measure 7, 4 above, 6 below
