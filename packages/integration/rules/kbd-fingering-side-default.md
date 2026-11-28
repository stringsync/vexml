### The rule

By default on a two-stave keyboard system, place right-hand (upper-stave) fingering above the treble stave and left-hand (lower-stave) fingering below the bass stave, clear of the stave lines, keeping the middle of the system clear for dynamics. See Behind Bars p. 309.

### The test case

`keyboard-fingering.musicxml` gives each fingering rule its own measure.

- Measure 1. Grand staff in 4/4 with four quarter notes on each stave, each carrying a `<fingering>` element with no explicit `placement` attribute (staff 1: 1–2–3–4; staff 2: 5–4–3–2).

### Renderers

- Behind Bars: agrees, places upper-stave fingerings above the treble stave and lower-stave fingerings below the bass stave, clear of the stave lines
- MuseScore: agrees, places upper-stave fingerings above the treble stave and lower-stave fingerings below the bass stave
- Verovio: differs, places both staves' default fingerings above their respective staves
- OSMD: agrees, places upper-stave fingerings above the treble stave and lower-stave fingerings below the bass stave

### Checks

1. Are the upper-stave fingerings placed above the treble stave and the lower-stave fingerings placed below the bass stave, clear of the stave lines?
   Crop: measure 1, 3 above, 17 below
   Book: p. 309, 0.13 0.39 0.24 0.19
