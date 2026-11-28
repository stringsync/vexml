### The rule

Align the second note of a two-note tremolo rhythmically halfway through the tremolo's duration against simultaneous notes in another part or staff. See Behind Bars p. 227.

### The test case

`two-note-tremolos-multi.musicxml` pairs tremolos in the upper staff with steady eighth notes in the lower staff.

- Measure 3. Whole-note tremolo (A4 to C5) against eight eighth notes: C5 should align with beat 3 (the fifth eighth note).
- Measure 4. Half-note tremolo (G4 to B4) and quarter-note tremolo (A4 to C5) against eight eighth notes: B4 should align with beat 2 (the third eighth note) and C5 with the second half of beat 3 (the sixth eighth note).

### Renderers

- Behind Bars: agrees, second note of each tremolo aligns vertically with the exact rhythmic midpoint in the lower staff
- MuseScore: agrees, second whole note aligns with beat 3 and half/quarter second notes align with beats 2 and 3.5
- Verovio: agrees, second whole note aligns with beat 3 and half/quarter second notes align with beats 2 and 3.5
- OSMD: agrees, second whole note aligns with beat 3 and half/quarter second notes align with beats 2 and 3.5

### Checks

1. Does the second note of the whole-note tremolo in measure 3 align vertically with the fifth eighth note (beat 3)?
   Crop: measure 3, 2 above, 13 below
   Book: p. 227, 0.15 0.63 0.70 0.08
2. Do the second notes of the half-note and quarter-note tremolos in measure 4 align vertically with the third and sixth eighth notes?
   Crop: measure 4, 2 above, 13 below
   Book: p. 227, 0.15 0.63 0.70 0.08
