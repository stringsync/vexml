### The rule

Indicate strummed chords with plain vertical arrows placed above the stave for passages of multiple strummed chords. See Behind Bars p. 379.

### The test case

`guitar-techniques.musicxml` isolates strummed chord arrows in measure 4.

- Measure 4. Four three-note quarter chords (`E4-B4-E5`) carrying alternating `<arrow><arrow-direction>up</arrow-direction></arrow>` and `down` technical marks.

### Renderers

- Behind Bars: agrees, places plain vertical up and down arrows cleanly above the stave over each chord
- MuseScore: differs, omits `<technical><arrow>` marks
- Verovio: differs, omits `<technical><arrow>` marks
- OSMD: differs, omits `<technical><arrow>` marks

### Checks

1. Do the four chords in measure 4 draw plain vertical up and down arrows cleanly above the stave?
   Crop: measure 4, 5 above, 3 below
   Book: p. 379, 0.24 0.40 0.20 0.08
