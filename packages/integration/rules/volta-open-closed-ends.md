### The rule

Close a non-final ending bracket with a downward hook at the repeat barline, keep it open-ended across a system break, leave a continuing final ending open-ended on the right, and close a final ending at the end of a piece parallel to the final double barline. See Behind Bars p. 237.

### The test case

`repeat-sections.musicxml` tests all four bracket-end cases.

- Measures 12–14. A two-bar first-time ending split across a system break (open-ended at the end of measure 12 and start of measure 13, closed at the repeat barline at the end of measure 13), followed by an open-ended second-time ending in measure 14.
- Measures 18–19. A first-time ending closing at the repeat barline and a final second-time ending closing parallel to the final double barline.

### Renderers

- Behind Bars: agrees, open across the system break, closed at the repeat barline, open on a continuing second ending, closed at the final double barline
- MuseScore: agrees, open across the system break, closed at the repeat barline, open on the continuing second ending, closed at the final double barline
- Verovio: agrees, open across the system break (adding a parenthesized `(1)`), closed at the repeat barline, open on the continuing second ending, closed at the final double barline
- OSMD: differs, omits the bracket continuation after the system break in measure 13 (closes measure 19 at the final barline)

### Checks

1. Across the system break between measures 12 and 13, is the first-time bracket open-ended at the break and closed at the repeat barline, with the continuing second-time bracket open-ended on the right?
   Crop: measure 13, 4 above, 2 below
   Book: p. 237, 0.32 0.22 0.36 0.15
2. At the end of the piece (measure 19), does the second-time bracket close with a downward hook parallel to the final double barline?
   Crop: measure 19, 4 above, 2 below
   Book: p. 236, 0.14 0.64 0.73 0.06
