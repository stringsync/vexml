### The rule

An octave extension line terminates with a right-angle end corner placed immediately after the last notehead, including any duration dots, rather than stretching across the note's full rhythmic space (Behind Bars p. 30). A corner is more visible than a bare vertical stroke, and stopping right after the dot makes the final transposed pitch unmistakable.

### The test case

`octave.musicxml`: measure 2 sets an `8va` over a quarter note C6 and a dotted half note D6, measuring where the bracket ends relative to the dotted note's right ink edge and checking the height of its end corner.

### What to look for

In measure 2, a green bracket beside the blue reference line at the dot's right edge shows the octave line ends immediately after the dot, and a green box confirms the right-angle end corner.
