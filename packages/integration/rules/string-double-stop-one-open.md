### The rule

On a single-stemmed double-stop with one open string, place the zero above the stave when the upper note is open and below the stave when the lower note is open; on a double-stemmed double-stop, place it on the open string's voice side. See Behind Bars p. 397.

### The test case

`strings-techniques.musicxml` attaches `<open-string/>` to one note of single-stemmed and double-stemmed double-stops without explicit `placement`.

- Measure 10. Single-stemmed double-stops: B4/E5 with upper E5 open (beat 1), and D4/B4 with lower D4 open (beat 3).
- Measure 11. Double-stemmed double-stops: voice 1 A4 open over voice 2 E4 (beat 1), and voice 1 C5 over voice 2 D4 open (beat 3).

### Renderers

- Behind Bars: agrees, places the zero above for an upper open string and below for a lower open string on both single- and double-stemmed double-stops
- MuseScore: differs, places the open-string circle above the stave in all cases
- Verovio: differs, places the open-string circle above the stave for both single-stemmed chords, though splits above and below by voice on double-stemmed chords
- OSMD: agrees, places `0` above for upper open strings and below for lower open strings on both single- and double-stemmed chords

### Checks

1. In measure 10 (single-stemmed double-stops), does the open-string mark sit above the stave when the upper note is open (beat 1) and below the stave when the lower note is open (beat 3)?
   Crop: measure 10, 5 above, 5 below
   Book: p. 397, 0.20 0.55 0.36 0.085
2. In measure 11 (double-stemmed double-stops), does the open-string mark sit above the stave for the upper voice (beat 1) and below the stave for the lower voice (beat 3)?
   Crop: measure 11, 5 above, 5 below
   Book: p. 397, 0.20 0.55 0.36 0.085
