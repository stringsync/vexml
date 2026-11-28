### The rule

Keep a very short tie within one stave-space. A short tie bowed through a line is lost against it. See Behind Bars p. 61.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 5. A sixteenth A4 tied to the dotted eighth right after it.

### Renderers

- Behind Bars: agrees, a short tie within one space
- MuseScore: agrees, the short tie stays in the space below
- Verovio: agrees, the short tie stays in the space below
- OSMD: agrees, the short tie stays in the space below

### Checks

1. Does the short tie stay within one space?
   Crop: measure 5, 8 spaces, 3 above, 4 below
