### The rule

When another part has grace notes preceding a beat, align a rest horizontally with the measured main note rather than with the grace notes. See Behind Bars p. 159.

### The test case

`metre-rests.musicxml` measure 2 puts two beamed 16th grace notes before beats 1 and 3 in staff 1 while staff 2 has a quarter rest on beat 1 and an eighth rest on beat 3.

- Measure 2. Staff 2 rests on beats 1 and 3 coincide with the main notes after staff 1's grace-note groups.

### Renderers

- Behind Bars: agrees, aligns rests with the measured main note rather than preceding grace notes
- MuseScore: agrees, aligns the beat-1 quarter rest and beat-3 eighth rest with staff 1's main notes after the grace groups
- Verovio: agrees, aligns both rests with staff 1's main notes after the grace groups
- OSMD: agrees, aligns both rests with staff 1's main notes after the grace groups

### Checks

1. Do the quarter rest on beat 1 and the eighth rest on beat 3 in staff 2 align with staff 1's main notes rather than the grace notes?
   Crop: measure 2, 2 above, 16 below
   Book: p. 159, 0.38 0.43 0.24 0.08
