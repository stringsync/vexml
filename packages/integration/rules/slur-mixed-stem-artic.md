### The rule

When notes under a slur have mixed stem directions, put the articulation beside each notehead even though the slur is above. See Behind Bars p. 122.

### The test case

`articulation.musicxml` isolates each rule by measure.

- Measure 6. Staccato on alternating down- and up-stemmed notes under a slur placed above.

### Renderers

- Behind Bars: agrees, marks beside each notehead
- MuseScore: agrees, dots on each head's side
- Verovio: agrees, dots on each head's side
- OSMD: agrees, dots on each head's side

### Checks

1. Is each dot on its own notehead side, not moved to the slur side?
   Crop: measure 6, 4 above, 6 below
