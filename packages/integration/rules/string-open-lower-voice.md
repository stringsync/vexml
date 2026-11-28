### The rule

Place an open-string zero below the stave for the lower of two voices sharing a stave. See Behind Bars p. 395.

### The test case

`strings-techniques.musicxml` attaches `<open-string/>` to both voices sharing a stave without explicit `placement`.

- Measure 4. Two voices sharing a stave: voice 1 has an open-string A4 half note and voice 2 has an open-string D4 half note.

### Renderers

- Behind Bars: agrees, places the upper voice's open-string zero above the stave and the lower voice's below the stave
- MuseScore: differs, draws only one open-string circle above the stave
- Verovio: agrees, places voice 1's open-string circle above the stave and voice 2's below the stave
- OSMD: agrees, places voice 1's `0` above the stave and voice 2's `0` below the stave

### Checks

1. Does voice 1's open-string mark sit above the stave and voice 2's sit below the stave in measure 4?
   Crop: measure 4, 5 above, 5 below
   Book: p. 395, 0.16 0.30 0.40 0.09
