### The rule

Curve an even number of chord ties half up and half down. A balanced chord reads evenly. See Behind Bars p. 65.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 11. A four-note chord, F4 A4 C5 E5, tied.

### Renderers

- Behind Bars: agrees, two up and two down
- MuseScore: agrees, two up and two down
- Verovio: agrees, two up and two down
- OSMD: differs, one up and three down

### Checks

1. Do the top two ties curve up and the bottom two down?
   Crop: measure 11, 4 above, 4 below
