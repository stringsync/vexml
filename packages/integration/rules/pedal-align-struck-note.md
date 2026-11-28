### The rule

Align the start of a pedal indication (the `P` of `Ped.` or `S` of `Sost. Ped.`) vertically beneath the struck note. See Behind Bars pp. 333, 335.

### The test case

`piano-pedalling.musicxml` places two separate damper pedal markings starting on beat 1 and beat 3 of measure 3.

- Measure 3. `Ped.` starts beneath C3 (beat 1) and F3 (beat 3) on staff 2.

### Renderers

- Behind Bars: agrees, the start of `Ped.` aligns directly beneath its struck notehead
- MuseScore: agrees, aligns the `P` of each `Ped.` directly beneath its struck note (omitting the extension line on short spans)
- Verovio: agrees, aligns the start of each pedal bracket directly beneath its struck note (omitting the `Ped.` text)
- OSMD: agrees, aligns each `Ped` directly beneath its struck note

### Checks

1. Does the start of each `Ped.` marking align horizontally beneath its struck note (beats 1 and 3 of measure 3)?
   Crop: measure 3, staff 2, 2 above, 7 below
   Book: p. 333, 0.14 0.72 0.24 0.20
