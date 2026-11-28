### The rule

Where staccato or tenuto marks fall under a slur, keep the slur clear of them, outside the marks, rather than drawing it through them. See Behind Bars p. 111.

### The test case

`slurs.musicxml` isolates each rule by measure.

- Measure 12. A slur under four stems-up notes that each carry a staccato dot.

### Renderers

- Behind Bars: agrees, slur outside the marks
- MuseScore: agrees, slur below the dots with room to spare
- Verovio: differs, slur ends touch the outer dots
- OSMD: differs, slur ends touch the outer dots

### Checks

1. Does the slur in measure 12 pass clear of all four staccato dots?
   Crop: measure 12, 3 above, 7 below
   Book: p. 111, 0.39 0.515 0.21 0.075
   Marks: shown
