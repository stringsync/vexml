### The rule

When a chord holds two seconds, each pair may take opposite directions as long as the middle ties neither touch nor cross. Touching ties cannot be told apart. See Behind Bars p. 66.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 28. A chord with two seconds, F4 G4 D5 E5, tied.

### Renderers

- Behind Bars: agrees, four separate ties
- MuseScore: agrees, two up and two down, all separate
- Verovio: agrees, two up and two down, all separate
- OSMD: agrees, two up and two down, all separate

### Checks

1. Are the four ties separate, with the middle two clear of each other?
   Crop: measure 28, 4 above, 4 below
