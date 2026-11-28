### The rule

Stack two harmonic circles vertically above the stave when both notes of a single-stemmed double-stop are natural harmonics. See Behind Bars p. 414.

### The test case

`strings-pizz-harmonics.musicxml` attaches `<harmonic><natural/><sounding-pitch/></harmonic>` to both notes of single-stemmed double-stops.

- Measure 8. Two half-note double-stops (A4/E5 and D5/A5) where both notes are marked as sounding-pitch natural harmonics.

### Renderers

- Behind Bars: agrees, stacks two harmonic circles vertically above the stave for each double-stopped natural harmonic
- MuseScore: differs, collapses both notes' harmonic marks into a single circle above each double-stop
- Verovio: agrees, stacks two harmonic circles vertically above each double-stop
- OSMD: differs, draws only a single `0` above each double-stop

### Checks

1. Does each double-stop in measure 8 display two harmonic circles stacked vertically above the stave without overlapping?
   Crop: measure 8, 6 above, 2 below
   Book: p. 414, 0.20 0.81 0.60 0.11
