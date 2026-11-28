### The rule

A clef change at the start of a bar is placed before the barline rather than after it (Behind Bars p. 8). Putting the clef ahead of the barline lets the player absorb the new pitch reference before reaching the downbeat.

### The test case

`clefs.musicxml`: a five-line stave in 4/4 with barline clef changes to alto clef at the start of measure 2 and tenor clef at the start of measure 3, without `after-barline="yes"`.

### What to look for

Blue vertical lines mark the opening barlines of measures 2 and 3. Each boxed C clef is labelled with whether it sits `before` or `after` its barline; both should sit before the barline.
