### The rule

When two percussion players share a single-line stave, place the upper part above the line with upward stems and the lower part below the line with downward stems, keeping independent rests separated on opposite sides and sharing rests when both voices rest together (Behind Bars pp. 288–289).

### The test case

`percussion-two-players.musicxml`: a single-line percussion stave (`<staff-lines>1</staff-lines>`) with voice 1 above the line (`C5`) and voice 2 below the line (`A4`), `<stem>` omitted. Measure 1 alternates notes and rests between the two players; measure 2 puts both players on beats 1–2 followed by a shared half rest.

### Renderers

- Behind Bars: agrees, upper part above the line with up-stems, lower part below with down-stems, rests on opposite sides when independent and shared on the line when identical
- MuseScore: agrees, upper voice takes up-stems with rests above and lower voice takes down-stems with rests below
- Verovio: agrees, upper voice takes up-stems with rests above and lower voice takes down-stems with rests below
- OSMD: agrees, upper voice takes up-stems with rests above and lower voice takes down-stems with rests below, sharing the measure 2 half rest

### Checks

1. In measure 1, do voice 1 notes above the line take upward stems and voice 2 notes below the line take downward stems, with their rests separated on opposite sides?
   Crop: measure 1, 3 above, 3 below
   Book: p. 289, 0.27 0.15 0.46 0.08
2. In measure 2, do simultaneous notes on either side of the single line keep opposing stems (upper up, lower down) without colliding?
   Crop: measure 2, 3 above, 3 below
   Book: p. 289, 0.27 0.15 0.46 0.08
