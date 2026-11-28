### The rule

Indicate right-hand fingering with `p`, `i`, `m`, `a` placed clear of the stave in italic typeface to differentiate it from other technical text. See Behind Bars p. 374.

### The test case

`guitar-fingering.musicxml` isolates single-note right-hand fingering in measure 4.

- Measure 4. Four quarter notes (written `E4`, `G4`, `B4`, `E5`) carrying unmarked `<pluck>` markings (`p`, `i`, `m`, `a`).

### Renderers

- Behind Bars: agrees, draws `p`, `i`, `m`, `a` clear of the stave in italic typeface
- MuseScore: agrees, draws `p`, `i`, `m`, `a` above the stave in italic typeface
- Verovio: differs, omits `<pluck>` markings
- OSMD: differs, omits `<pluck>` markings

### Checks

1. Are the right-hand fingerings `p`, `i`, `m`, `a` in measure 4 placed clear of the stave and set in italic typeface?
   Crop: measure 4, 4 above, 4 below
   Book: p. 374, 0.14 0.82 0.26 0.08
