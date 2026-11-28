### The rule

On a two-line percussion stave, centre rests around the middle space: the whole rest hangs from the top line, the half rest sits on the bottom line, and quarter and shorter rests centre on the middle space (Behind Bars p. 284).

### The test case

`percussion-rests.musicxml` part 1 (`<staff-lines>2</staff-lines>`): measure 1 contains a whole-measure rest; measure 2 contains a half rest, quarter rest, eighth rest, and sixteenth rest (followed by a sixteenth note).

### Renderers

- Behind Bars: agrees, whole rest hangs from top line, half rest sits on bottom line, shorter rests centred on middle space
- MuseScore: agrees, whole rest hangs from top line, half rest sits on bottom line, shorter rests centred on middle space
- Verovio: agrees, whole rest hangs from top line, half rest sits on bottom line, shorter rests centred on middle space
- OSMD: agrees, whole rest hangs from top line, half rest sits on bottom line, shorter rests centred on middle space

### Checks

1. On the 2-line stave (part 1, measure 1), does the whole-measure rest hang from the top line into the middle space?
   Crop: measure 1, part 1, 2 above, 2 below
   Book: p. 284, 0.16 0.17 0.34 0.06
2. On the 2-line stave (part 1, measure 2), does the half rest sit on the bottom line and do the quarter, eighth, and sixteenth rests centre around the middle space?
   Crop: measure 2, part 1, 2 above, 2 below
   Book: p. 284, 0.16 0.17 0.34 0.06
