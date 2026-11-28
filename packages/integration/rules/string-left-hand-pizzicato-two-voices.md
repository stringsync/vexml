### The rule

In two-part writing sharing a stave, place each left-hand pizzicato `+` sign on the stem side of its voice (above the stave for the upper voice, below the stave for the lower voice). See Behind Bars p. 412.

### The test case

`strings-pizz-harmonics.musicxml` attaches `<stopped/>` without explicit `placement` to both voices sharing a stave.

- Measure 5. Two voices of half notes (voice 1: C5, D5; voice 2: E4, F4), every note marked with `<stopped/>`.

### Renderers

- Behind Bars: agrees, places the upper voice's `+` above the stave and the lower voice's `+` below the stave
- MuseScore: differs, draws only one `+` above the stave per beat, omitting the lower voice's below-stave `+`
- Verovio: agrees, places voice 1's `+` above the stave and voice 2's `+` below the stave
- OSMD: agrees, places voice 1's `+` above the stave and voice 2's `+` below the stave

### Checks

1. In measure 5, do voice 1's `+` signs sit above the stave and voice 2's `+` signs sit below the stave without colliding with stems?
   Crop: measure 5, 5 above, 5 below
   Book: p. 412, 0.14 0.75 0.36 0.11
