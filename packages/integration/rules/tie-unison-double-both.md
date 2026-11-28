### The rule

When two voices share a unison notehead and both are tied, each part must have its own tie (upper curving up, lower curving down). See Behind Bars p. 69.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 12. Voice 1 and voice 2 share A4 half tied to A4 half, both voices tied.

### Renderers

- Behind Bars: agrees, shared notehead with upper tie up and lower tie down
- MuseScore: agrees, shared notehead with upper tie up and lower tie down
- Verovio: agrees, shared notehead with upper tie up and lower tie down
- OSMD: agrees, shared notehead with upper tie up and lower tie down

### Checks

1. Does the shared A4 unison carry both an upward tie for voice 1 and a downward tie for voice 2?
   Crop: measure 12, 4 above, 4 below
