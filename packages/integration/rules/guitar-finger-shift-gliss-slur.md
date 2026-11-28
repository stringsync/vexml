### The rule

Notate a silent finger shift with both a straight glissando line between the noteheads and a slur connecting the two notes. See Behind Bars p. 377.

### The test case

`guitar-techniques.musicxml` isolates silent finger shifts in measure 2.

- Measure 2. Two pairs of quarter notes (`A4` to `C5` with fingering `2`, and `E5` to `C5` with fingering `4`), each connected by both a solid `<glissando>` and a `<slur>`.

### Renderers

- Behind Bars: agrees, draws both a straight glissando line between the noteheads and a clear slur spanning each pair
- MuseScore: differs, draws a wavy glissando line instead of a straight line beneath each slur
- Verovio: agrees, draws a straight glissando line between the noteheads with a slur above each pair
- OSMD: agrees, draws a straight glissando line between the noteheads with a slur spanning each pair

### Checks

1. Does each pair in measure 2 draw both a straight glissando line between the noteheads and a clean slur without colliding?
   Crop: measure 2, 5 above, 4 below
   Book: p. 377, 0.24 0.84 0.50 0.08
