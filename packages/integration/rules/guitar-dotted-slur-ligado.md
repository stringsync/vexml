### The rule

Draw a dotted slur for left-hand *ligado*, placed on the notehead side (even in two-part writing where room allows) to stay close to left-hand fingerings. See Behind Bars p. 377.

### The test case

`guitar-techniques.musicxml` isolates dotted *ligado* slurs in measure 1.

- Measure 1. Two-voice writing where the upper voice has a dotted slur (`<slur type="start" line-type="dotted"/>`) over beamed eighth notes (`A4-B4-C5-B4`) with left-hand fingerings (`2`, `4`, `1`, `4`) above a lower-voice bass (`A3`, `E4`).

### Renderers

- Behind Bars: agrees, places the dotted slur on the notehead side close to the notes and left-hand fingerings
- MuseScore: differs, places the dotted slur above the beam on the stem side of the upper voice
- Verovio: differs, places the dotted slur above the beam on the stem side of the upper voice
- OSMD: differs, draws a solid slur above the beam on the stem side

### Checks

1. Does measure 1 draw a clearly dotted slur on the upper voice on the notehead side without colliding with the notes, stems, or fingerings?
   Crop: measure 1, 5 above, 4 below
   Book: p. 377, 0.13 0.55 0.52 0.10
