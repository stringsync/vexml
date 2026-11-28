### The rule

Curve the two ties of a second away from each other, and let them set the direction of the chord’s other ties. Two ties side by side curving the same way merge. See Behind Bars p. 66.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 27. An up-stem chord G4 A4 C5 with a second at the bottom, tied.

### Renderers

- Behind Bars: agrees, G4 down, A4 and C5 up
- MuseScore: agrees, G4 down, A4 and C5 up
- Verovio: differs, C5 up, A4 and G4 down
- OSMD: differs, C5 up, A4 and G4 down

### Checks

1. Does the G4 tie curve down, and the A4 and C5 ties up?
   Crop: measure 27, 4 above, 4 below
