### The rule

Make a tie between tightly spaced notes as long as possible. A longer tie is easier to see. See Behind Bars p. 62.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 5. A sixteenth A4 tied to the dotted eighth right after it.

### Renderers

- Behind Bars: agrees, as long as the spacing allows
- MuseScore: agrees, the tie runs from head to head
- Verovio: agrees, the tie runs from head to head
- OSMD: agrees, the tie runs from head to head

### Checks

1. Does the tie reach from one head to the other rather than shrink into the gap?
   Crop: measure 5, 8 spaces, 3 above, 4 below
