### The rule

When the two pitches of a two-note tremolo are an octave or more apart, the tremolo beams may sit between the notes with conventional opposing stem directions, slanting in the direction of the interval, to save vertical space. See Behind Bars p. 226.

### Why a person decides

Behind Bars presents between-note beams with opposing stems as an acceptable space-saving alternative to same-direction stems when the interval is an octave or wider.

### The test case

`two-note-tremolos.musicxml` isolates each case in its own measure.

- Measure 3. Two half-note tremolos spanning an octave or more: D4 to D5 (ascending octave) and E5 to C4 (descending tenth).

### Renderers

- Behind Bars: agrees, allows opposing stems with beams slanting between the notes in the direction of the interval
- MuseScore: differs, points both stems upward and places the beams above the stave
- Verovio: differs, points both stems upward and places the beams above the stave
- OSMD: agrees, uses opposing stems with strokes slanting in the direction of the interval

### Checks

1. For the wide-interval tremolos (D4 to D5 and E5 to C4), are the stems and slanting tremolo beams laid out cleanly without colliding or mis-slanting?
   Crop: measure 3, 3 above, 3 below
   Book: p. 226, 0.37 0.69 0.26 0.06
