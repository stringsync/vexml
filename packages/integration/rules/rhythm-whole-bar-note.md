### The rule

Balance a lone note slightly left of centre in a narrow bar when every part has a single duration. (Behind Bars p. 41)

### The test case

`rhythmic-spacing.musicxml` uses a narrow interior bar containing only a whole note. The user chose MuseScore and Verovio's treatment over the book's: vexml keeps the lone note at beat 1, after the opening divider, rather than balancing it towards the centre.

### Renderers

- Behind Bars: agrees, balances the whole note just left of the bar's centre
- MuseScore: differs, left-aligns the whole note at beat 1
- Verovio: differs, left-aligns the whole note at beat 1
- OSMD: agrees, draws the whole note near the bar's centre

### Checks

1. Does the whole note sit at beat 1, near the opening divider, as MuseScore and Verovio draw it?
   Crop: measure 6
   Book: p. 41, 0.28 0.42 0.43 0.05
