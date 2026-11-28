### The rule

Place scordatura re-tuning indications above the opening of the first stave clear of the clef and opening notes. See Behind Bars pp. 388–389.

### The test case

`guitar-harmonics-scordatura.musicxml` isolates scordatura tuning indications in measure 1.

- Measure 1. A `<direction><direction-type><scordatura><accord string="6"><tuning-step>D</tuning-step><tuning-octave>2</tuning-octave></accord></scordatura></direction-type></direction>` at the start of the first measure, followed by four quarter notes (`D3`, `A3`, `D4`, `F#4`).

### Renderers

- Behind Bars: agrees, places the re-tuning indication cleanly above the opening of the first stave
- MuseScore: differs, omits `<scordatura>`
- Verovio: differs, omits `<scordatura>`
- OSMD: differs, omits `<scordatura>`

### Checks

1. Does the scordatura tuning indication appear cleanly above the opening of measure 1 without colliding with the clef or opening notes?
   Crop: measure 1, 6 above, 4 below
   Book: p. 389, 0.18 0.14 0.18 0.10
