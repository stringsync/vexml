### The rule

Tilt the open slur that starts on the last note of a system towards the pitch it reaches on the next system, so it reads as open-ended. See Behind Bars p. 112.

### The test case

`slurs-structure.musicxml` isolates each rule by measure.

- Measure 1. A slur starting on the last note (D5) of the system and ending on a higher F5 on the next.

### Renderers

- Behind Bars: agrees, angles the open slur towards the next pitch
- MuseScore: agrees, climbs to the right towards the next pitch
- Verovio: unavailable, the crop does not show the system end
- OSMD: differs, draws a level arc that dips at the end

### Checks

1. Does the slur at the end of measure 1 climb towards the right?
   Crop: measure 1, from 60 spaces, 27 spaces, 3 above, 6 below
