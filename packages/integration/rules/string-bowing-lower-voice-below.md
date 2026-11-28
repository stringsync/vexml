### The rule

When two parts share a stave, place bowing marks for the lower part below the stave (inverted, though sharing a stave with bowing is discouraged). See Behind Bars p. 405.

### The test case

`strings-techniques.musicxml` attaches `<down-bow/>` and `<up-bow/>` to both voices sharing a stave without explicit `placement`.

- Measure 14. Two voices sharing a stave: voice 1 has down-bow and up-bow on C5 and D5, and voice 2 has down-bow and up-bow on E4 and F4.

### Renderers

- Behind Bars: agrees, places the upper part's bowing marks above the stave and the lower part's bowing marks inverted below the stave
- MuseScore: differs, places both voices' bowing marks above the stave
- Verovio: agrees, places voice 1's bowing marks above the stave and voice 2's bowing marks inverted below the stave
- OSMD: differs, places both voices' bowing marks above the stave

### Checks

1. In measure 14, do voice 1's bowing marks sit above the stave and voice 2's bowing marks sit below the stave?
   Crop: measure 14, 5 above, 5 below
   Book: p. 405, 0.36 0.52 0.28 0.11
