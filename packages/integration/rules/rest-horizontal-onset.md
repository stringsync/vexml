### The rule

Position a rest horizontally at the exact start of its duration, just as if it were a note of equivalent value, never centred inside its beat. See Behind Bars p. 159.

### The test case

`metre-rests.musicxml` measure 1 pairs a reference rhythm in staff 1 (half, quarter, dotted-eighth, sixteenth) with equivalent rests in staff 2 (half rest, quarter rest, dotted-eighth rest, sixteenth note).

- Measure 1. Each rest in staff 2 shares an onset with the corresponding note in staff 1.

### Renderers

- Behind Bars: agrees, positions each rest at the start of its duration aligned with equivalent notes in the other stave
- MuseScore: agrees, aligns the half, quarter and dotted-eighth rests directly under staff 1's matching notes
- Verovio: agrees, aligns the half, quarter and dotted-eighth rests directly under staff 1's matching notes
- OSMD: agrees, aligns the half, quarter and dotted-eighth rests directly under staff 1's matching notes

### Checks

1. Do the half rest, quarter rest and dotted-eighth rest in staff 2 align vertically under the matching notes in staff 1 rather than centring in their beats?
   Crop: measure 1, 2 above, 16 below
   Book: p. 159, 0.18 0.16 0.65 0.08
