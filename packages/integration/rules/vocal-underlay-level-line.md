### The rule

Place each line of sung text as close to the stave as possible without colliding with notes, ledger lines, or other notation, keeping one level horizontal baseline parallel to the stave for the length of the system rather than stepping up and down under low notes. See Behind Bars pp. 438–439.

### The test case

`vocal-underlay.musicxml` mixes mid-stave pitches (`A4`, `F4`, `G4`) with low ledger-line notes (`B3`, `G3`, `A3`) across one system in measures 2–3.

- Measures 2–3. Eight quarter notes spanning `A4` down to `G3` on a single system with continuous lyric underlay.

### Renderers

- Behind Bars: agrees, aligns every syllable on a single horizontal baseline parallel to the stave and clear of the lowest ledger-line notes
- MuseScore: agrees, aligns all syllables across measures 2–3 on one level horizontal baseline clear of `B3`, `G3`, and `A3`
- Verovio: agrees, aligns all syllables across measures 2–3 on one level horizontal baseline clear of `B3`, `G3`, and `A3`
- OSMD: agrees, aligns all syllables across measures 2–3 on one level horizontal baseline clear of `B3`, `G3`, and `A3`

### Checks

1. In measure 2, do all syllables (`O`, `qui-`, `et`, `stream,`) sit on one level horizontal baseline parallel to the stave and clear of the low ledger-line notes (`B3`, `G3`)?
   Crop: measure 2, 3 above, 8 below
   Book: p. 439, 0.255 0.155 0.480 0.075
2. In measure 3, do the continuing syllables (`where`, `do`, `you`, `glide?`) remain on that same level horizontal baseline clear of the low ledger-line `A3`?
   Crop: measure 3, 3 above, 8 below
   Book: p. 439, 0.255 0.155 0.480 0.075
