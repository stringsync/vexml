### The rule

Align a syllable sung to more than one note (including slurred melismas and tied notes) left under its first notehead rather than centring it, so the eye is drawn forward along the melisma. See Behind Bars pp. 439–440.

### The test case

`vocal-underlay.musicxml` places a four-note slurred melisma (`Stay`) and a two-note tied syllable (`true`) with `<extend/>` and no explicit `justify` attribute in measure 6.

- Measure 6. Four beamed slurred eighth notes under `Stay` followed by two tied quarter notes under `true`.

### Renderers

- Behind Bars: agrees, left-aligns both melisma and tied-note syllables under their first notehead
- MuseScore: agrees, left-aligns both `Stay` (slurred melisma) and `true` (tied notes) under their first notehead
- Verovio: differs, centres both `Stay` and `true` under their first notehead
- OSMD: differs, centres both `Stay` and `true` under their first notehead

### Checks

1. In measure 6, are `Stay` (slurred melisma) and `true` (tied notes) left-aligned under their first noteheads rather than centred?
   Crop: measure 6, 4 above, 7 below
   Book: p. 439, 0.130 0.770 0.375 0.065
