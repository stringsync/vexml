### The rule

In two-stave SATB layout, centre shared text underlay between the two staves, place dynamics above the upper stave and below the lower stave, and place a deviating voice’s separate underlay at its stem end beyond any dynamic markings. See Behind Bars p. 468.

### The test case

`choral-two-stave-satb.musicxml` places shared lyrics (`Come`, `home`) under the upper stave, `p` dynamics above treble and below bass, and a deviating bass underlay (`soft`, `and`, `low`) below the bass stave.

- Measure 1. Shared lyrics sit between the two staves; bass’s separate lyrics should sit below the bass `p` dynamic without colliding.

### Renderers

- Behind Bars: agrees, centres shared text between the staves and puts deviating bass lyrics below the bass dynamic
- MuseScore: agrees, centres shared text between the staves and places bass lyrics below the bass `p` dynamic
- Verovio: agrees, centres shared text between the staves and places bass lyrics below the bass `p` dynamic
- OSMD: agrees, centres shared text between the staves and places bass lyrics below the bass `p` dynamic

### Checks

1. Does the shared text sit cleanly between the staves, and does the deviating bass text sit below the bass `p` dynamic?
   Crop: measure 1, part 2, 16 above, 10 below
   Book: p. 468, 0.08 0.74 0.80 0.19
