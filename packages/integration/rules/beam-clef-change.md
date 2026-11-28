### The rule

When a clef change falls inside a beamed group, the beam slants according to the notes' visual stave positions regardless of the clef change, and stems lengthen as needed so the beam does not run through the new clef (Behind Bars p. 23). Keeping the beam clear of the clef preserves legibility for both the clef and the rhythmic grouping.

### The test case

`beams.musicxml`: measure 24 beams four eighths across a mid-group bass clef change (C5, B4 in treble clef, bass clef, then D3, E3), checking that the mid-group clef is drawn and has zero pixel overlap with the beam.

### What to look for

In measure 24, a blue reference box frames the mid-group bass clef and a green box on the beam reports `clear` (0px overlap).
