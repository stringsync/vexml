### The rule

In two-stave SATB layout with separate stems, place articulations and syllabic slurs at the stem ends of all parts (above for soprano and tenor, below for alto and bass). See Behind Bars p. 468.

### The test case

`choral-two-stave-satb.musicxml` places `<tenuto/>` articulations and two-note syllabic `<slur>` spans on soprano, alto, tenor, and bass in measure 1 with placement unset.

- Measure 1. Tenutos and slurs sit above the soprano and tenor stems and below the alto and bass stems.

### Renderers

- Behind Bars: agrees, places articulations and syllabic slurs at the stem ends of all four voices
- MuseScore: agrees, places tenutos and syllabic slurs at the stem ends of soprano, alto, tenor, and bass
- Verovio: agrees, places tenutos and syllabic slurs at the stem ends of soprano, alto, tenor, and bass
- OSMD: agrees, places tenutos and syllabic slurs at the stem ends of soprano, alto, tenor, and bass

### Checks

1. Do tenutos and syllabic slurs sit at the stem ends of soprano and tenor (above) and alto and bass (below)?
   Crop: measure 1, part 1, 5 above, 18 below
   Book: p. 468, 0.08 0.74 0.80 0.18
