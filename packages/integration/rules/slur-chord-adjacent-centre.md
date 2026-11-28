### The rule

On a chord with adjacent notes, centre the slur on the notehead that lies on the correct side of the stem. See Behind Bars p. 114.

### The test case

`slurs-structure.musicxml` isolates each rule by measure.

- Measure 7. A slur between two chords of adjacent notes.

### Renderers

- Behind Bars: agrees, centred on the head on the correct side
- MuseScore: agrees, centred on the correct-side head
- Verovio: differs, draws the slur below on the stem side
- OSMD: agrees, roughly centred on the head

### Checks

1. Is the slur centred on the notehead on the correct side of each stem?
   Crop: measure 7, 3 above, 6 below

### Why a person decides

Gould says which head to centre on but not how far the slur may sit from it.
