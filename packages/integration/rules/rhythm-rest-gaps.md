### The rule

Give each longer duration at least as much horizontal room as shorter neighbours, including when the event is a rest. (Behind Bars p. 39–40)

### The test case

`rhythmic-spacing.musicxml` uses two identical eighth notes, a quarter rest and a half note.

### Renderers

- Behind Bars: agrees, spaces a rest by its duration like a note of the same value
- MuseScore: agrees, gives the quarter rest a wider gap than either eighth
- Verovio: agrees, gives the quarter rest a wider gap than either eighth
- OSMD: agrees, gives the quarter rest a wider gap than either eighth

### Checks

1. Is the space after the quarter rest at least as large as either eighth-note interval?
   Crop: measure 1, from 7 spaces, 15 spaces
