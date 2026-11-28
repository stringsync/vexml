### The rule

When space is tight, move a dynamic to the left of its note, never to the right, since the note has already started. See Behind Bars p. 103.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 3. The same `ppp` and `ff` over eighth notes, where the two dynamics compete for room.

### Renderers

- Behind Bars: agrees, starts each dynamic at or before its note
- MuseScore: agrees, starts ppp at its note and ff after it, never right of the notehead
- Verovio: agrees, starts each dynamic at or before its note
- OSMD: agrees, starts each dynamic at or before its note

### Checks

1. Does each dynamic in measure 3 start at or before its note rather than after it?
   Crop: measure 3, 2 above, 7 below
   Book: p. 103, 0.14 0.31 0.34 0.09
