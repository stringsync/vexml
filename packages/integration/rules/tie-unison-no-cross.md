### The rule

Ties on a chord containing a unison must not overlap or cross; it is better to point a tie to the other notehead than to let ties cross. See Behind Bars p. 69.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 10. Single-stemmed half chord F4 F4 A4 C5 with a perfect unison at the bottom, all four notes tied.

### Renderers

- Behind Bars: agrees, four ties stay clear without overlapping or crossing
- MuseScore: agrees, three ties up and one down, none overlapping or crossing
- Verovio: differs, both F4 ties curve down and overlap each other
- OSMD: agrees, two ties up and two stacked down, none overlapping or crossing

### Checks

1. Do all four ties on the F4 F4 A4 C5 chord stay clear of each other without overlapping or crossing?
   Crop: measure 10, 4 above, 4 below
