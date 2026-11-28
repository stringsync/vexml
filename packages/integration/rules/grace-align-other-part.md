### The rule

When grace notes after a barline displace the first beat to the right in one part, align all other parts with the measured beat rather than with the grace notes. See Behind Bars pp. 127-128.

### The test case

`grace-notes-parts.musicxml` isolates multi-part grace-note alignment by measure.

- Measure 2. Part 1 opens with two grace notes (`D5-E5`) before beat 1 (`F5`); Part 2 opens directly with beat 1 (`A4`).

### Renderers

- Behind Bars: agrees, aligns the other part with beat 1 rather than the grace notes
- MuseScore: agrees, aligns Part 2’s beat 1 with Part 1’s measured beat 1
- Verovio: agrees, aligns Part 2’s beat 1 with Part 1’s measured beat 1
- OSMD: agrees, aligns Part 2’s beat 1 with Part 1’s measured beat 1

### Checks

1. Does Part 2’s beat 1 in measure 2 align vertically with Part 1’s measured beat 1 rather than with Part 1’s grace notes?
   Crop: measure 2, 4 above, 14 below
   Book: p. 128, 0.28 0.16 0.44 0.10
