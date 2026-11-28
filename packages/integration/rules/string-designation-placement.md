### The rule

Place a string designation above the stave by default, and below the stave only for the lower of two voices with separate stems sharing a stave. See Behind Bars p. 394.

### The test case

`strings-techniques.musicxml` attaches `<string>` technical marks without explicit `placement`.

- Measure 1. Single-voice up-stem and down-stem quarter notes carrying string designations (`3` and `2`).
- Measure 2. Two voices sharing a stave, with string designations on both voice 1 (upper) and voice 2 (lower).

### Renderers

- Behind Bars: agrees, places single-voice string designations above the stave and lower-voice designations below the stave
- MuseScore: agrees, places single-voice string numbers above the stave and voice 2's string numbers below the stave
- Verovio: unavailable, omits `<string>` technical marks on standard notation staves
- OSMD: agrees, places single-voice Roman string numerals above the stave and voice 2's Roman numerals below the stave

### Checks

1. Do single-voice string designations (measure 1) sit above the stave regardless of stem direction?
   Crop: measure 1, 5 above, 2 below
   Book: p. 394, 0.17 0.63 0.67 0.12
2. In two-voice writing sharing a stave (measure 2), does the upper voice's string designation sit above the stave and the lower voice's sit below the stave?
   Crop: measure 2, 5 above, 5 below
   Book: p. 394, 0.17 0.63 0.67 0.12
