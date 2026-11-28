### The rule

When a chord contains adjacent seconds and one note is an open string, align the open-string zero horizontally with that specific notehead. See Behind Bars p. 397.

### The test case

`strings-techniques.musicxml` attaches `<open-string/>` to one note of an adjacent-second double-stop without explicit `placement`.

- Measure 12. Two up-stem second chords: D4/E4 with lower-left D4 open (beat 1), and G4/A4 with upper-right A4 open (beat 3).

### Renderers

- Behind Bars: agrees, aligns the open-string zero horizontally over or under the specific open notehead of the second
- MuseScore: differs, aligns both open-string circles over the left-hand notehead
- Verovio: differs, centres both open-string circles over the chord rather than shifting to the right-hand notehead
- OSMD: differs, aligns both `0` marks below the left-hand notehead

### Checks

1. In measure 12, is each open-string mark aligned horizontally with its own notehead (left head on beat 1, right head on beat 3)?
   Crop: measure 12, 5 above, 5 below
   Book: p. 397, 0.30 0.69 0.38 0.065
