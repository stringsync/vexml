### The rule

The opening clef is indented from the left edge of the stave by one stave-space or a little less (Behind Bars p. 6). A small indent separates the clef from the system's starting barline or bracket without wasting horizontal space.

### The test case

`clefs.musicxml`: a five-line stave in 4/4 opening with a treble clef in measure 1, with no explicit positioning attributes.

### What to look for

A blue vertical line marks the left edge of the stave, and a horizontal bracket above the opening treble clef shows its indent in quarter stave-spaces. The indent should be greater than `¼` and at most `1` stave-space.
