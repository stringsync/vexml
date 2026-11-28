### The rule

When one stave changes time signature while another stave keeps the prevailing metre, allow space after the barline in all parts so simultaneous beats after the barline align vertically. See Behind Bars p. 173.

### The test case

`metre-polymetre.musicxml` measures 1–3 set two parts in 3/8 where Part 1 changes to 6/16 at measure 2 and returns to 3/8 at measure 3 while Part 2 remains in 3/8.

- Measure 2. Part 1 prints 6/16 after the barline; Part 2 leaves matching space so both parts’ downbeats align.
- Measure 3. Part 1 prints 3/8 after the barline; Part 2 leaves matching space so both parts’ downbeats align.

### Renderers

- Behind Bars: agrees, reserves space after the barline in the unchanged part so beat 1 aligns across both staves
- MuseScore: agrees, leaves matching space after the barline in Part 2 so beat 1 aligns vertically with Part 1’s downbeat after 6/16
- Verovio: differs, propagates the 6/16 time signature onto Part 2 instead of leaving blank space after the barline
- OSMD: differs, propagates the 6/16 time signature onto Part 2 instead of leaving blank space after the barline

### Checks

1. At measures 2 and 3, does Part 2 leave space after the barline so its first note aligns vertically with Part 1’s first note after the new time signature?
   Crop: measure 2, 2 above, 18 below
   Book: p. 173, 0.24 0.84 0.52 0.09
