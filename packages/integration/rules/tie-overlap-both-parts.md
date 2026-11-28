### The rule

When both overlapping parts are tied and normal directions would make their ties intersect, curve the ties away from their stems so they stay clear of each other. One tie should never intersect another. See Behind Bars p. 67.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 5. Crossed voices, both tied: voice 1 ties G4 half to G4 half (up-stem) while voice 2 ties C5 half to C5 half (down-stem).

### Renderers

- Behind Bars: agrees, C5 tie curves up and G4 tie curves down so they do not intersect
- MuseScore: differs, curves C5 down and G4 up between the notes
- Verovio: differs, curves C5 down and G4 up so the two ties collide
- OSMD: agrees, C5 tie curves up and G4 tie curves down

### Checks

1. Does C5’s tie curve up and G4’s tie curve down without intersecting?
   Crop: measure 5, 4 above, 4 below
