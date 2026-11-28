### The rule

Place short syllabic slurs close to the noteheads, moving them above the stave when low pitches below the stave would push the lyrics too far down. See Behind Bars p. 436.

### Why a person decides

Behind Bars states that short syllabic slurs are usually placed close to noteheads, while on pitches below the stave they may be best placed above the stave to keep the lyric baseline from dropping too low.

### The test case

`vocal-slurs-breathing.musicxml` places short two-note syllabic slurs without explicit `placement` in measures 1 and 2.

- Measure 1. Two beamed pairs of mid-stave eighth notes (F4 to G4, A4 to G4) with short slurs and lyrics.
- Measure 2. Two beamed pairs of low eighth notes below the stave (B3 to A3, C4 to B3) with short slurs and lyrics.

### Renderers

- Behind Bars: agrees, places short slurs close to noteheads on mid-stave notes and moves them above the stave on low notes below the stave
- MuseScore: differs, keeps short slurs below the noteheads on both mid-stave and low notes
- Verovio: differs, keeps short slurs below the noteheads on both mid-stave and low notes
- OSMD: differs, places short slurs above the stems on both mid-stave and low notes

### Checks

1. In measure 1, do the short syllabic slurs sit close to the noteheads without crowding the lyrics below?
   Crop: measure 1, 5 above, 10 below
   Book: p. 436, 0.080 0.200 0.510 0.090
2. In measure 2, are the short syllabic slurs on low pitches placed above the stave (or kept clear) without pushing the lyrics too far down?
   Crop: measure 2, 5 above, 10 below
   Book: p. 436, 0.625 0.200 0.250 0.095
