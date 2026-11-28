### The rule

When an octave transposition crosses a system break, the extension line extends to the last barline of the first system without crossing it, and the new system repeats the `8` (optionally in parentheses) just before or flush with its first note (Behind Bars p. 30). Repeating the numeral reminds the player that the transposition is still active on the new line.

### The test case

`octave.musicxml`: an `8va` starts on beat 1 of measure 5, crosses a forced system break into measure 6, and ends after beat 2 of measure 6.

### What to look for

At the end of measure 5, a green box (`within barline`) beside the blue barline reference shows the octave line stops at the system-end barline without crossing it; at the start of measure 6, a green box (`resumes`) confirms the continuation numeral appears before the first note.
