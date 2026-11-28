### The rule

Draw a tick breath mark (`✓`) above the stave after its note to indicate a breathing point, visually distinct from the breath comma (`,`) reserved for a short lift. See Behind Bars p. 246.

### The test case

`woodwind.musicxml` places a tick breath mark after beat 1 and a comma breath mark after beat 3 in measure 1.

- Measure 1. Half-note A4 with `<breath-mark>tick</breath-mark>` followed by half-note B4 with `<breath-mark>comma</breath-mark>`.

### Renderers

- Behind Bars: agrees, draws a tick (`✓`) above the stave after the note for a breathing point, distinct from a comma
- MuseScore: agrees, draws a tick (`✓`) above the stave after beat 1 and a comma (`,`) after beat 3
- Verovio: differs, draws a comma (`,`) for both `<breath-mark>tick</breath-mark>` and `<breath-mark>comma</breath-mark>`
- OSMD: differs, draws a comma (`,`) for both `<breath-mark>tick</breath-mark>` and `<breath-mark>comma</breath-mark>`

### Checks

1. Does `<breath-mark>tick</breath-mark>` after the first note draw a tick (`✓`) above the stave rather than a comma, distinct from the comma after the second note?
   Crop: measure 1, 5 above, 2 below
   Book: p. 246, 0.35 0.42 0.48 0.08
