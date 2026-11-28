### The rule

Indicate altered open-string pitches clearly at the start of a scordatura passage. See Behind Bars p. 424.

### The test case

`strings-ensembles.musicxml` places a `<scordatura>` direction with two retuned strings at the opening of measure 2 without an explicit `placement` attribute.

- Measure 2. A `<scordatura>` tuning direction (string 4 tuned to F♯3, string 3 tuned to C♯4) followed by four quarter notes.

### Renderers

- Behind Bars: agrees, shows altered open-string pitches on a small stave diagram at the start of the scordatura passage
- MuseScore: differs, omits the `<scordatura>` direction completely
- Verovio: differs, omits the `<scordatura>` direction completely
- OSMD: differs, omits the `<scordatura>` direction completely

### Checks

1. Does measure 2 display the altered open-string tuning clearly above the stave at the start of the passage without colliding with the stave or notes?
   Crop: measure 2, 6 above, 2 below
   Book: p. 425, 0.130 0.425 0.260 0.065
