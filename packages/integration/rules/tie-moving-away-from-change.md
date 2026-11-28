### The rule

In a single-stemmed chord where a note is added or released, curve the ties away from the added or released note to draw attention to the change. See Behind Bars p. 70.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 16. Beats 1 2 add D5 above tied G4 B4 (both ties should curve down); beats 3 4 add G4 below tied B4 D5 (both ties should curve up).

### Renderers

- Behind Bars: agrees, first pair curves down (away from added D5), second pair curves up (away from added G4)
- MuseScore: differs, splits each pair opposite ways regardless of added notes
- Verovio: differs, splits each pair opposite ways regardless of added notes
- OSMD: differs, splits each pair opposite ways regardless of added notes

### Checks

1. Do the first two ties curve down (away from added D5) and the next two curve up (away from added G4)?
   Crop: measure 16, 4 above, 4 below
