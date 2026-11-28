### The rule

Never let a hairpin cross a stave line: a mark drawn on the stave becomes inconspicuous or illegible. See Behind Bars p. 102.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 4. A crescendo hairpin below the stave over three quarter notes.

### Renderers

- Behind Bars: agrees, draws the hairpin below the stave
- MuseScore: agrees, draws the hairpin below the stave
- Verovio: agrees, draws the hairpin below the stave
- OSMD: agrees, draws the hairpin below the stave

### Checks

1. Does the hairpin in measure 4 stay clear of every stave line?
   Crop: measure 4, 2 above, 6 below
   Book: p. 102, 0.34 0.15 0.23 0.07
