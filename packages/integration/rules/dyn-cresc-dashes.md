### The rule

Follow `cresc.` with widely spaced dashes that start after the word and show how long the change lasts. See Behind Bars p. 106.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 11. `cresc.` with a `dashes` line from the first to the fifth of six quarter notes, ending at `f`.

### Renderers

- Behind Bars: agrees, dashes follow the word on its line
- MuseScore: differs, starts the dashes below the stave, under the word
- Verovio: agrees, dashes follow the word on its line
- OSMD: agrees, dashes follow the word on a line below

### Checks

1. Do the dashes in measure 11 start after the word `cresc.` and run on towards `f`?
   Crop: measure 11, 6 above, 7 below
   Book: p. 106, 0.29 0.305 0.41 0.02
