### The rule

Place harp pedal settings mid-system between the two staves of a grand-staff part when room allows, so there is no doubt which system they refer to. See Behind Bars p. 356.

### The test case

`harp-grand.musicxml` uses a braced two-staff harp part (treble and bass).

- Measure 1. A complete seven-pedal `<harp-pedals>` diagram (`D♭ C♮ B♯ | E♮ F♯ G♭ A♮`) with no explicit `placement` attribute, over whole notes `E4` and `C3`.

### Renderers

- Behind Bars: agrees, places pedal settings mid-system between the two staves when room allows
- MuseScore: differs, places the `<harp-pedals>` diagram above the upper stave when placement is unspecified
- Verovio: differs, omits `<harp-pedals>`
- OSMD: differs, omits `<harp-pedals>`

### Checks

1. In measure 1, is the harp pedal diagram placed between the two staves rather than above the upper stave?
   Crop: measure 1, 5 above, 15 below
   Book: p. 358, 0.10 0.48 0.26 0.10
