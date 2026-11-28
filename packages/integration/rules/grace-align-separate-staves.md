### The rule

When separate parts carry grace notes with different accidentals, closing each group up to its following measured note is preferred over forcing vertical alignment across staves. See Behind Bars p. 128.

### The test case

`grace-notes-parts.musicxml` isolates multi-part grace-note alignment by measure.

- Measure 3. Part 1 has two grace notes with sharps (`F#4-G#4` before `A4`); Part 2 has two plain grace notes (`D4-E4` before `F4`).

### Renderers

- Behind Bars: agrees, closes Part 2’s plain grace notes up to their following main note
- MuseScore: agrees, closes Part 2’s plain grace notes up to their following main note
- Verovio: agrees, closes Part 2’s plain grace notes up to their following main note
- OSMD: differs, aligns Part 2’s plain grace notes with the left edge of Part 1’s sharped grace notes

### Checks

1. In measure 3, do Part 2’s plain grace notes close up to their following whole note rather than aligning with the left edge of Part 1’s sharped grace notes?
   Crop: measure 3, 4 above, 14 below
   Book: p. 128, 0.20 0.65 0.30 0.10

### Why a person decides

Gould presents closing up separate-stave grace notes as a visual preference ("it may be more helpful visually") rather than a rigid requirement.
