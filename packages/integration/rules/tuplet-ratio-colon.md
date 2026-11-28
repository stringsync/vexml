### The rule

Notate a full tuplet ratio using a colon between the actual and normal numerals (such as `5:3`) to mean “in the time of”. See Behind Bars p. 207.

### The test case

`tuplet-ratios.musicxml` gives each case its own measure.

- Measure 1. Five beamed eighth notes in 2/4 with a 5:3 time-modification and `show-number="both"`, followed by a plain eighth note.

### Renderers

- Behind Bars: agrees, draws `5:3` with a colon centred on the beam
- MuseScore: agrees, draws `5:3` with a colon centred above the beam
- Verovio: agrees, draws `5:3` with a colon centred above the beam
- OSMD: agrees, draws `5:3` with a colon centred above the beam

### Checks

1. Is the full tuplet ratio drawn as `5:3` with a colon centred over the five beamed eighth notes?
   Crop: measure 1, 3 above, 2 below
   Book: p. 207, 0.36 0.43 0.28 0.05
