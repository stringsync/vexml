### The rule

Leave roughly one to one-and-a-half clear stave spaces between the clef, key and time signatures at a system opening. (Behind Bars p. 41)

### The test case

`symbol-spacing.musicxml` uses a treble clef, two-sharp signature and four-four at the opening.

### Renderers

- Behind Bars: agrees, its p. 42 example marks 1–1¼ spaces from clef to key and 1–1½ from key to time
- MuseScore: agrees, roughly ¾ space from clef to key and 1 from key to time, a little tight at the clef
- Verovio: agrees, about 1 space from clef to key and 1 from key to time
- OSMD: agrees, about 1 space from clef to key and 1½ from key to time

### Checks

1. Is there one to one-and-a-half spaces from the clef to the key signature?
   Crop: measure 1, 8 spaces
   Book: p. 42, 0.50 0.16 0.19 0.06

2. Is there one to one-and-a-half spaces from the key to the time signature?
   Crop: measure 1, from 4 spaces, 7 spaces
   Book: p. 42, 0.50 0.16 0.19 0.06
