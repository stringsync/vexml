### The rule

When a melisma extender crosses a system break, allow room before the barline if it starts at system end, stop it at the barline before a cautionary key or time signature change, and resume it just before the first note of the new system together with the slur or tie. See Behind Bars p. 447.

### The test case

`vocal-extenders.musicxml` starts an extender and slur on the last beat of measure 5 (`ward`) before a system break with a cautionary key and time signature change, ending on beat 2 of measure 6 on the next system.

- Measure 5 (system 3). Ends on beat 4 (`ward`, `<extend type="start"/>`, slur start) followed by cautionary two-flat key and `3/4` time signatures.
- Measure 6 (system 4). Opens in B-flat major `3/4` with slurred notes on beats 1–2 (`<extend type="stop"/>` on beat 2) and `now.` on beat 3.

### Renderers

- Behind Bars: agrees, gives room for the extender before the closing barline (stopping short of cautionary signatures) and resumes the extender before the first note of the new system alongside the slur
- MuseScore: agrees, draws the extender after `ward` stopping at the barline before the cautionary signatures and resumes it before beat 1 of measure 6 to beat 2
- Verovio: agrees, ends the extender before the cautionary signatures at system end and resumes it before beat 1 of measure 6 to beat 2
- OSMD: differs, draws the extender to the end of measure 5 and resumes it before beat 1 of measure 6, but omits the cautionary key and time signatures in measure 5

### Checks

1. At the end of measure 5, does the extender begin after `ward` and stop at the barline before the cautionary key and time signatures?
   Crop: measure 5, 4 above, 7 below
   Book: p. 447, 0.165 0.520 0.675 0.070
2. At the start of measure 6 on the new system, does the extender resume just before the first note and run to the second notehead?
   Crop: measure 6, 4 above, 7 below
   Book: p. 447, 0.165 0.520 0.675 0.070
