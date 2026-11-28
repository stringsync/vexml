### The rule

Finish a slur at the end of a system just short of the last barline, never beyond it. See Behind Bars p. 112.

### The test case

`slurs-structure.musicxml` isolates each rule by measure.

- Measure 1. A slur that starts on the last note of the system and carries on into the next.

### Renderers

- Behind Bars: agrees, ends the slur just short of the last barline
- MuseScore: differs, runs the slur to the end of the stave
- Verovio: unavailable, the crop does not show the system end
- OSMD: agrees, stops the slur short of the barline

### Checks

1. Does the slur at the end of measure 1 stop just short of the closing barline?
   Crop: measure 1, from 70 spaces, 17 spaces, 3 above, 6 below
