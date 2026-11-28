### The rule

In two-stave SATB layout, give each voice part its own stem direction throughout: voice 1 (soprano and tenor) stems up and voice 2 (alto and bass) stems down. See Behind Bars p. 468.

### The test case

`choral-two-stave-satb.musicxml` places two voices on the upper treble stave (S/A) and two voices on the lower bass stave (T/B) with `<stem>` unset.

- Measure 1. Soprano and tenor notes stem upward while alto and bass notes stem downward on every beat.

### Renderers

- Behind Bars: agrees, stems soprano and tenor up and alto and bass down throughout
- MuseScore: agrees, stems soprano and tenor up and alto and bass down throughout
- Verovio: agrees, stems soprano and tenor up and alto and bass down throughout
- OSMD: agrees, stems soprano and tenor up and alto and bass down throughout

### Checks

1. Do soprano and tenor take upward stems and alto and bass take downward stems throughout measure 1?
   Crop: measure 1, part 1, 5 above, 18 below
   Book: p. 468, 0.08 0.74 0.80 0.18
