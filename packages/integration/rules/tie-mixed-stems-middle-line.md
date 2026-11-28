### The rule

When the two stems point opposite ways, curve the tie away from the middle line, which also keeps it off an up-stem flag. Curving below-middle ties upward drives them into the first note’s flag. See Behind Bars p. 64.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 21. C5 quarters, stem up then down; A4 eighth (stem up) tied to an A4 quarter (stem down).

### Renderers

- Behind Bars: agrees, C5 up and A4 down, clear of the flag
- MuseScore: differs, curves the A4 tie up over the flag
- Verovio: differs, curves the C5 tie down
- OSMD: differs, curves the A4 tie up past the flag

### Checks

1. Do both ties curve down, the A4 tie missing the eighth’s flag?
   Crop: measure 21, 4 above, 4 below

### Why a person decides

Every renderer draws this differently from Gould, and Verovio curves both ties down. The user chose both down, so the upper tie keeps clear of the lower one (decisions.md, 2026-11-26).
