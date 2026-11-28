### The rule

On a single-line percussion stave, default stems point upward so articulation and dynamics sit together below the line and tuplet indications sit above the stems clear of dynamics (Behind Bars p. 283).

### The test case

`percussion-lines.musicxml` part 1 (`<staff-lines>1</staff-lines>`), measure 1: unpitched quarter and beamed eighth notes on the single line with `<stem>` omitted, accompanied by a dynamic and articulations.

### Renderers

- Behind Bars: agrees, recommends upward stems on a single-line part so articulations and dynamics sit below the line
- MuseScore: agrees, draws upward stems on the single-line stave with articulations and dynamics below
- Verovio: differs, draws downward stems on the single-line stave
- OSMD: differs, draws downward stems on the single-line stave

### Checks

1. Do the notes on the single-line percussion stave in part 1, measure 1 take upward stems by default?
   Crop: measure 1, part 1, 3 above, 3 below
   Book: p. 283, 0.24 0.63 0.26 0.08
