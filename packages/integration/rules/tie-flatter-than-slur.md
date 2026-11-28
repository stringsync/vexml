### The rule

Give a tie a flatter arc than a slur over the same notes. The flatter arc leaves room for slurs and tells the two apart. See Behind Bars p. 60.

### The test case

`ties.musicxml` gives each case its own measure.

- Measures 2 and 3. The same two A4 half notes, tied in measure 2 and slurred in measure 3.

### Renderers

- Behind Bars: agrees, the tie flatter than the slur
- MuseScore: differs, draws the tie and the slur about equally deep
- Verovio: agrees, a flat tie and a rounder slur
- OSMD: agrees, a flat tie and a rounder slur

### Checks

1. Is the tie in measure 2 flatter than the slur in measure 3, by about half a stave-space?
   Crop: measure 2, 3 above, 4 below
2. Is the slur in measure 3 rounder than the tie before it, with vexml's original gentle bow?
   Crop: measure 3, 3 above, 4 below

### Why a person decides

How much flatter is a matter of eye, and the renderers range from alike to clearly flatter. After comparing Behind Bars' deeper bow and more moderate reference bows, the user kept vexml's original slur bow, about ½ stave-space deeper than the tie (decisions.md, 2026-11-26).
