### The rule

Draw tremolo beams on whole-note (semibreve) two-note tremolos between the notes as if they were stemmed (or moved closer to the noteheads when clear of notes and ledger lines). See Behind Bars pp. 226–227.

### The test case

`two-note-tremolos.musicxml` isolates each case in its own measure.

- Measure 4. Whole-note two-note tremolo on F4 to A4 with three strokes.
- Measure 5. Whole-note two-note tremolo on C5 to E5 with three strokes.

### Renderers

- Behind Bars: agrees, three tremolo beams centred between the whole notes at notional stem positions
- MuseScore: agrees, three tremolo beams above the stave at notional stem positions
- Verovio: agrees, three tremolo beams between the whole notes following the pitch slope
- OSMD: agrees, draws three strokes between the whole notes

### Checks

1. Are three tremolo beams drawn cleanly between the whole notes in measures 4 and 5?
   Crop: measure 4, 3 above, 3 below
   Book: p. 226, 0.10 0.80 0.78 0.08
