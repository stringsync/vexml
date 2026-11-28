### The rule

Put the shorter of two simultaneous slurs closest to the notes and the longer one outside it. See Behind Bars p. 113.

### The test case

`slurs-structure.musicxml` isolates each rule by measure.

- Measure 3. A long slur over four notes with a short slur over the first two.

### Renderers

- Behind Bars: agrees, short slur between the notes and the long slur
- MuseScore: agrees, short slur inside the long one
- Verovio: agrees, short slur inside the long one
- OSMD: agrees, short slur inside the long one

### Checks

1. Does the short slur sit between the notes and the long slur?
   Crop: measure 3, 3 above, 6 below
