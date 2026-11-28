### The rule

Start a hairpin at the left edge of the first notehead it covers and finish it no later than the following note, never before a note starts or after it ends. See Behind Bars p. 104.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 4. A crescendo that starts on the first of four quarter notes and stops on the fourth.

### Renderers

- Behind Bars: agrees, starts on the first note and ends at the last
- MuseScore: agrees, starts on the first note and ends near the last
- Verovio: agrees, starts on the first note and ends before the last
- OSMD: agrees, starts on the first note and ends near the last

### Checks

1. Does the hairpin in measure 4 start at the first note and stop no later than the following note?
   Crop: measure 4, 2 above, 6 below
   Book: p. 104, 0.09 0.61 0.77 0.065
