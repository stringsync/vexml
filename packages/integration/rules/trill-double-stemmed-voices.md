### The rule

In double-stemmed two-voice writing, place the upper part’s trill sign above the stave and the lower part’s trill sign below the stave, with dynamics further from the stave where there is room. See Behind Bars p. 135.

### The test case

`trills.musicxml` isolates trill design and placement rules by measure.

- Measure 2. Two voices on one stave: voice 1 (`E5`) and voice 2 (`G4`) both carry `<trill-mark/>` with no `placement` set, and voice 2 carries a `p` dynamic.

### Renderers

- Behind Bars: agrees, places voice 1’s trill above the stave and voice 2’s trill below the stave, inside the dynamic
- MuseScore: agrees, places voice 1’s trill above the stave and voice 2’s trill below the stave, above the `p` dynamic
- Verovio: agrees, places voice 1’s trill above the stave and voice 2’s trill below the stave, above the `p` dynamic
- OSMD: differs, omits voice 2’s trill sign

### Checks

1. In measure 2, does voice 1’s `tr` sit above the stave and voice 2’s `tr` sit below the stave (above the `p` dynamic)?
   Crop: measure 2, 6 above, 8 below
   Book: p. 135, 0.28 0.58 0.22 0.14
