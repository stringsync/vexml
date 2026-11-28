### The rule

On a three-line percussion stave, centre rests on the middle line: the whole rest hangs from the middle line, the half rest sits on the middle line, and quarter and shorter rests centre on the middle line (Behind Bars p. 284).

### The test case

`percussion-rests.musicxml` part 2 (`<staff-lines>3</staff-lines>`): measure 1 contains a whole-measure rest; measure 2 contains a half rest, quarter rest, eighth rest, and sixteenth rest (followed by a sixteenth note).

### Renderers

- Behind Bars: agrees, whole rest hangs from middle line, half rest sits on middle line, shorter rests centred on middle line
- MuseScore: agrees, whole rest hangs from middle line, half rest sits on middle line, shorter rests centred on middle line
- Verovio: differs, hangs the whole rest from the top line while centring half and shorter rests on the middle line
- OSMD: differs, hangs the whole rest from the top line while centring half and shorter rests on the middle line

### Checks

1. On the 3-line stave (part 2, measure 1), does the whole-measure rest hang from the middle line?
   Crop: measure 1, part 2, 2 above, 2 below
   Book: p. 284, 0.50 0.17 0.34 0.06
2. On the 3-line stave (part 2, measure 2), does the half rest sit on the middle line and do the quarter, eighth, and sixteenth rests centre on the middle line?
   Crop: measure 2, part 2, 2 above, 2 below
   Book: p. 284, 0.50 0.17 0.34 0.06
