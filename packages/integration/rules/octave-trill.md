### The rule

When an octave transposition covers a note with a trilled wavy line, the extension line continues for the note's written duration rather than stopping immediately after the notehead (Behind Bars p. 30). Extending across the trill shows that the entire ornamental sustain remains transposed.

### The test case

`octave.musicxml`: measure 8 sets an `8va` over a trilled dotted half note C6 (with a wavy line) followed by an untransposed quarter note G4, checking that the octave bracket reaches across the trill toward the following note.

### What to look for

In measure 8, a green horizontal bracket (`through trill`) spans the `8va` across the trilled dotted half toward the blue reference line at the following quarter note.
