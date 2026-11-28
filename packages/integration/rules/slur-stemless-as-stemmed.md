### The rule

For stemless notes, place a slur as if the notes had stems; for notes on the centre line, treat them as down-stemmed. See Behind Bars p. 110.

### The test case

`slurs.musicxml` isolates each rule by measure.

- Measure 9. A slur over two low whole notes.
- Measure 10. A slur over two whole notes on the centre line.

### Renderers

- Behind Bars: agrees, slur below low whole notes and above centre-line ones
- MuseScore: agrees, slur below low whole notes and above centre-line ones
- Verovio: agrees, slur below low whole notes and above centre-line ones
- OSMD: agrees, slur below low whole notes and above centre-line ones

### Checks

1. Does the slur in measure 9 sit below the low whole notes, as if they had up-stems?
   Crop: measure 9, 3 above, 7 below
   Book: p. 110, 0.085 0.675 0.77 0.05

2. Does the slur in measure 10 sit above the centre-line whole notes, as if they had down-stems?
   Crop: measure 10, 5 above, 3 below
   Book: p. 110, 0.085 0.675 0.77 0.05
