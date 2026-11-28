### The rule

An octave sign sits outside all other notation and must never cut through other symbols (Behind Bars p. 29). Keeping the numeral and dashed line clear of articulations, ornaments, and notes prevents visual confusion while reading.

### The test case

`octave.musicxml`: measures 1–8 combine `8va` and `8vb` brackets with accents, tuplets, and a trilled dotted half note (measure 8), checking every octave bracket for pixel overlap with any non-stave ink.

### What to look for

In measure 8, a red box flags the `tr` ornament overlapping the `8va` sign (`ornament (9px)`), where the octave bracket fails to lift clear of the trill.
