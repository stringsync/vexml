### The rule

In double-stemmed writing, place each part's tuplet bracket and numeral at its own stem end, further from the stave than articulation marks and shorter slurs. See Behind Bars p. 199.

### The test case

`tuplets-double-stem.musicxml` places two simultaneous quarter-note triplets on one stave in measure 1.

- Measure 1. Voice 1 (stems up): C5, D5, E5 quarter triplet with staccato dots. Voice 2 (stems down): E4, D4, C4 quarter triplet with staccato dots.

### Renderers

- Behind Bars: agrees, places the upper-voice bracket above its stems and staccatos, and the lower-voice bracket below its stems and staccatos
- MuseScore: agrees, places the upper-voice bracket above its stems and staccatos, and the lower-voice bracket below its stems and staccatos
- Verovio: agrees, places the upper-voice bracket above its stems and staccatos, and the lower-voice bracket below its stems and staccatos
- OSMD: differs, lets the upper bracket collide with the staccatos and misplaces the lower-voice bracket

### Checks

1. In measure 1, is the upper-voice triplet bracket above its stems and staccatos, and the lower-voice triplet bracket below its stems and staccatos?
   Crop: measure 1, 8 above, 8 below
   Book: p. 199, 0.26 0.20 0.47 0.11
