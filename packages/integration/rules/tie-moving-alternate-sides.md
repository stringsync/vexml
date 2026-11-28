### The rule

When one note is released on one side of a tied note while another is added on the opposite side, curve the tie away from the note added in the second chord (unless reversing clarifies which note is tied). See Behind Bars p. 70.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 17. Beats 1 2: G4 B4 to B4 D5 with B4 tied (D5 added above → tie down); beats 3 4: B4 D5 to G4 B4 with B4 tied (G4 added below → tie up).

### Renderers

- Behind Bars: agrees, first tie curves down (away from added D5), second curves up (away from added G4)
- MuseScore: differs, first tie curves up and second curves down
- Verovio: differs, first tie curves up and second curves down
- OSMD: differs, first tie curves up and second curves down

### Checks

1. Does the first B4 tie curve down (away from added D5) and the second curve up (away from added G4)?
   Crop: measure 17, 4 above, 4 below
