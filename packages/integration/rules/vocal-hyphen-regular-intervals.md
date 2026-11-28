### The rule

Place hyphens at regular intervals between widely spaced syllables of a divided word, avoiding positioning a hyphen directly beneath a notehead where it might be mistaken for a tenuto line. See Behind Bars pp. 448–449.

### The test case

`vocal-hyphens.musicxml` spans a two-syllable word (`Re-joice`) across a seven-note slurred melisma over measures 2–3 with no explicit `<distance type="hyphen">` override.

- Measures 2–3. `Re` on measure 2 beat 1, slurred through six intervening quarter notes across the barline to `joice` on measure 3 beat 4.

### Renderers

- Behind Bars: agrees, distributes multiple evenly spaced hyphens across the wide gap between `Re` and `joice`, avoiding placing hyphens directly under noteheads
- MuseScore: agrees, places evenly spaced hyphens across measures 2 and 3 between `Re` and `joice`
- Verovio: agrees, places evenly spaced hyphens across measures 2 and 3 between `Re` and `joice`
- OSMD: agrees, places evenly spaced hyphens across measures 2 and 3 between `Re` and `joice`

### Checks

1. In measure 2, are multiple hyphens spaced regularly after `Re` across the four-beat melisma rather than a single hyphen stuck to `Re`?
   Crop: measure 2, 4 above, 7 below
   Book: p. 449, 0.195 0.120 0.610 0.070
2. In measure 3, do evenly spaced hyphens continue across the measure into `joice` on beat 4 without sitting directly beneath noteheads?
   Crop: measure 3, 4 above, 7 below
   Book: p. 449, 0.195 0.120 0.610 0.070
