### The rule

Mid-bar, a trill line runs right up to the next notehead or its accidental, so it shows the full duration of the trilled note. See Behind Bars p. 136.

### The test case

`trill-lines.musicxml` isolates trill lines by measure.

- Measure 2. A trilled half-note `E5` followed by a half-note `F♯5` with its sharp, where the wavy line stops.

### Renderers

- Behind Bars: agrees, runs the line up to the next notehead and its accidental
- MuseScore: agrees, line reaches the next note and runs on through it
- Verovio: agrees, line reaches the next note
- OSMD: agrees, line reaches the next note

### Checks

1. In measure 2, does the trill line run right up to the sharp on the next note, with no big gap?
   Crop: measure 2, 6 above, 3 below
