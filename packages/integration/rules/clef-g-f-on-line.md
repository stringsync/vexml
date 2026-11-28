### The rule

The G (treble) clef curls around the second stave-line from the bottom, and the F (bass) clef's two dots straddle the fourth stave-line from the bottom (Behind Bars p. 5). Anchoring each clef precisely on its pitch line lets the player read every note on the stave without hesitation.

### The test case

`clefs.musicxml`: a five-line stave in 4/4 that opens in treble clef in measure 1 and switches to bass clef at the start of system 2 (measure 5), with no explicit positioning attributes.

### What to look for

Judged by eye, because each clef's internal anchor comes from the music font. In measure 1, check that the spiral of the treble clef centres on the second line from the bottom; at the start of system 2 (measure 5), check that the bass clef's two dots sit cleanly above and below the fourth line from the bottom.

### Checks

1. Does the treble clef curl around the G line?
   Crop: measure 1, 5 spaces
   Book: p. 5, 0.326 0.870 0.045 0.043
2. Do the bass clef's dots sit either side of the F line?
   Crop: measure 5, 5 spaces
   Book: p. 5, 0.533 0.871 0.045 0.040
