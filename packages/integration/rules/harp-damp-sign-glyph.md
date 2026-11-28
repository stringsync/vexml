### The rule

Draw an individual harp damping instruction (`<damp/>` or `<damp-all/>`) using the circle-with-cross damping sign (`⊕`), placed outside the stave clear of notes. See Behind Bars p. 364.

### The test case

`harp-marks.musicxml` uses a single-staff treble harp part.

- Measure 3. A half note `C5` followed by two quarter rests, with `<damp/>` on beat 3 and `<damp-all/>` on beat 4, placement unspecified.

### Renderers

- Behind Bars: agrees, draws the circle-with-cross damping sign clear of the stave
- MuseScore: differs, omits `<damp/>` and `<damp-all/>`
- Verovio: differs, omits `<damp/>` and `<damp-all/>`
- OSMD: differs, omits `<damp/>` and `<damp-all/>`

### Checks

1. In measure 3, are both damping marks drawn as circle-with-cross signs clear of the stave?
   Crop: measure 3, 6 above, 4 below
   Book: p. 364, 0.22 0.56 0.56 0.10
