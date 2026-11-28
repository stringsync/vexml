### The rule

Notate a narrator’s rhythmic spoken part on a single-line stave using ordinary noteheads aligned on the line, with stems pointing upward and lyrics placed clearly below the line. See Behind Bars p. 457.

### The test case

`vocal-speech-single-line.musicxml` renders a two-measure single-line narrator stave (`<staff-lines>1</staff-lines>`).

- Measures 1–2. Unpitched notes (`E4` display position) with beamed eighths and a quarter triplet in measure 1 and four beamed eighths in measure 2, no explicit `<stem>` directions, and spoken lyrics below.

### Renderers

- Behind Bars: agrees, aligns ordinary noteheads on the single line with upward stems and lyrics below
- MuseScore: differs, places unpitched `E4` noteheads three ledger lines below the single line with upward stems
- Verovio: differs, aligns ordinary noteheads on the single line but points stems downward with the triplet bracket below into the lyric space
- OSMD: differs, aligns ordinary noteheads on the single line but points stems downward into the lyric space

### Checks

1. Do the ordinary noteheads sit on the single line with stems pointing upward and lyrics clearly below the line?
   Crop: measure 1, 5 above, 5 below
   Book: p. 457, 0.19 0.20 0.62 0.08
