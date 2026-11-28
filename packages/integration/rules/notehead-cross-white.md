### The rule

Half and whole crossed noteheads are drawn as a cross surrounded by a thin unshaded circle, distinguishing longer durations from black crossed noteheads without crowding a hollow oval (Behind Bars p. 12).

### The test case

`noteheads.musicxml`: the C5 half crossed notehead at the end of measure 5 and the A4 whole crossed notehead in measure 6, leaving notehead glyph selection for `<notehead>x</notehead>` to vexml.

### What to look for

In measures 5 and 6, blue vertical lines probe each white cross head's centre column for ink above and below the crossing; boxes around the half and whole cross heads should read `circled` rather than `bare`.
