### The rule

On a double-stemmed cross-staff beam, place secondary and fractional beams on the stem side of each subdivision (when all or outer stems of the subdivision share a direction, or for fractional beams) so that beam corners do not jut out awkwardly from the primary beam. See Behind Bars pp. 316–317.

### The test case

`keyboard-cross-staff-beams.musicxml`, measure 3: beat 1 has two 16ths on staff 2 followed by two 16ths on staff 1; beat 2 has a dotted eighth on staff 1 and a fractional 16th on staff 2; beat 3 has an eighth on staff 2 followed by two 16ths on staff 1.

### Renderers

- Behind Bars: agrees, places secondary and fractional beams on the stem side of each subdivision without jutting corners
- MuseScore: agrees, places beat-1 secondary beams below the lower pair and above the upper pair, the beat-2 fractional 16th hook below on the stem side, and beat-3 secondary beam above on the stem side
- Verovio: differs, runs the beat-1 secondary beam continuously above the primary beam across both staves instead of switching to the stem side on the lower-stave pair
- OSMD: differs, places all beams above the upper stave with all stems pointing upward

### Checks

1. Are the secondary and fractional 16th beams in measure 3 placed cleanly on the stem side of their subdivisions without jutting corners?
   Crop: measure 3, 2 above, 15 below
   Book: p. 316, 0.17 0.29 0.65 0.07
