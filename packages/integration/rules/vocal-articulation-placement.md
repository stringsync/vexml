### The rule

In vocal music, place articulation marks either above the stave or beside the noteheads, moving them above the stave when below-stave marks on low notes would push the lyrics too far down. See Behind Bars p. 434.

### Why a person decides

Behind Bars treats both all-above articulation placement and notehead-side articulation placement as acceptable practice in vocal music, leaving the threshold for moving low-note articulations above the stave to avoid lowering the text to engraving judgement.

### The test case

`vocal-clef-dynamics.musicxml` tests default vocal articulations without explicit `placement` in measures 3 and 4.

- Measure 3. Mid-stave quarter notes (F4 to B4) with accents, tenuto, and staccato over one line of lyrics.
- Measure 4. Low quarter notes below the stave (A3 to C4) with accents, tenuto, and staccatissimo over two lyric verses.

### Renderers

- Behind Bars: agrees, accepts both above-stave and notehead-side placement, moving low-note articulations above the stave so lyrics stay close
- MuseScore: differs, keeps articulations on the notehead side below the stave even on low notes in measure 4, pushing the lyrics down
- Verovio: differs, keeps articulations on the notehead side below the stave even on low notes in measure 4, pushing the lyrics down
- OSMD: differs, keeps articulations on the notehead side below the stave even on low notes in measure 4, pushing the lyrics down

### Checks

1. In measure 3, are the mid-stave articulations cleanly placed without crowding or colliding with the lyrics?
   Crop: measure 3, 5 above, 11 below
   Book: p. 434, 0.200 0.630 0.600 0.100
2. In measure 4, are the low-note articulations placed above the stave (or kept compact) so the two lyric verses are not forced too far below the stave?
   Crop: measure 4, 5 above, 13 below
   Book: p. 434, 0.200 0.768 0.280 0.095
