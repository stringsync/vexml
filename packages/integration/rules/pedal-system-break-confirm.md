### The rule

When a held pedal continues across a system break, keep the extension line open at the end of the first system and confirm the continuing pedal at the start of the new system (e.g. `(Ped.)`). See Behind Bars pp. 332–333.

### The test case

`piano-pedalling.musicxml` starts a damper pedal line on beat 1 of measure 6, breaks to a new system at measure 7 (`<print new-system="yes"/>`), and stops the pedal at the end of measure 7.

- Measure 6–7. The pedal line should run open to the right edge of measure 6 and resume on measure 7 on the next system until its release hook at the end of measure 7.

### Renderers

- Behind Bars: agrees, leaves the pedal line open at the system end and confirms `(Ped.)` at the start of the new system
- MuseScore: agrees, confirms `(Ped.)` with a continuing solid line and upward release hook at the start of measure 7 on the new system
- Verovio: differs, omits the continuing pedal line on measure 7 after the system break
- OSMD: differs, continues the solid line and release hook on measure 7 without a `(Ped.)` confirmation label

### Checks

1. Does the pedal line continue across the system break between measure 6 and measure 7, staying open at the end of measure 6 and resuming on measure 7?
   Crop: measure 7, staff 2, 2 above, 7 below
   Book: p. 333, 0.72 0.12 0.20 0.14
