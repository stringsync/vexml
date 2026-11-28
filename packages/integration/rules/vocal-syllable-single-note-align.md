### The rule

Centre each single-note syllable directly under its notehead; for very long syllables, place only the first two or three letters to the left of the notehead so the text does not start too far before its sung note (crossing a barline if necessary). See Behind Bars p. 439.

### The test case

`vocal-underlay.musicxml` mixes short single-note syllables (`I`, `walk`, `by`, `of`) with very long single-note syllables (`bright`, `spark-`, `strengths`) including a very long syllable on beat 1 after a barline in measures 4–5.

- Measures 4–5. Short and lengthy single-note syllables across a barline, with no explicit `<lyric justify>` attribute.

### Renderers

- Behind Bars: agrees, centres ordinary syllables under their noteheads and shifts very long syllables rightward so only the first two or three letters precede the notehead
- MuseScore: differs, centres ordinary syllables and also centres the very long syllable `strengths` directly under its notehead (crossing the barline) without shifting it rightward
- Verovio: differs, centres ordinary syllables and centres `strengths` under its notehead rather than shifting it rightward
- OSMD: differs, centres ordinary syllables and centres `strengths` under its notehead rather than shifting it rightward

### Checks

1. In measure 4, are normal single-note syllables (`I`, `walk`, `by`, `bright`) centred under their noteheads while `spark-` stays cleanly anchored?
   Crop: measure 4, 3 above, 7 below
   Book: p. 439, 0.195 0.610 0.610 0.065
2. In measure 5, is the very long syllable `strengths` on beat 1 positioned so only the first two or three letters precede the notehead without colliding with the barline or following syllable `of`?
   Crop: measure 5, 3 above, 7 below
   Book: p. 439, 0.195 0.610 0.610 0.065
