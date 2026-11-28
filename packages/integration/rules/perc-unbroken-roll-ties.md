### The rule

Connect all note-values of an unbroken percussion roll with solid ties (including across barlines and when punctuated with accents), keeping the ties clear of tremolo strokes and accents (Behind Bars p. 294).

### The test case

`percussion-rolls.musicxml`: a five-line percussion stave with three-stroke single-note tremolos (`<tremolo type="single">3</tremolo>`) tied across measures 1–2, and a tied three-stroke roll in measure 3 with an accent on the second note.

### Renderers

- Behind Bars: agrees, draws solid ties connecting consecutive tremolo notes and keeps ties clear of tremolo strokes and accents
- MuseScore: agrees, draws solid ties above the noteheads clear of tremolo strokes, with the accent above the tie
- Verovio: agrees, draws solid ties above the noteheads clear of tremolo strokes, with the accent above the tie
- OSMD: agrees, draws solid ties above the noteheads clear of tremolo strokes, with the accent above the tie

### Checks

1. In measures 1–2, do solid ties connect the consecutive three-stroke roll notes without colliding with the tremolo strokes?
   Crop: measure 1, 2 above, 2 below
   Book: p. 294, 0.19 0.46 0.32 0.06
2. In measure 3, does the accented roll note keep both its solid ties and its accent clearly legible without colliding with the tremolo strokes?
   Crop: measure 3, 2 above, 2 below
   Book: p. 294, 0.41 0.81 0.18 0.06
