### The rule

Set `sub.` on the same line as the sudden dynamic, beside it, so the dynamic sits exactly under its note. See Behind Bars p. 107.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 14. `mf`, then `sub.` with `p` on the third quarter note.

### Renderers

- Behind Bars: agrees, sub. sits beside p on its line, to the right
- MuseScore: differs, draws sub. above the stave while p is below
- Verovio: agrees, sub. sits on p's line, to its left
- OSMD: agrees, sub. sits on p's line, to its left

### Checks

1. Does `sub.` in measure 14 sit on the same line as `p`?
   Crop: measure 14, 6 above, 7 below
   Book: p. 107, 0.25 0.75 0.48 0.05
