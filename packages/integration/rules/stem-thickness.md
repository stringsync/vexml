### The rule

Stems should be drawn thinner than stave lines, while staying dark enough to read cleanly (Behind Bars p. 13). Keeping stems lighter than the stave grid prevents vertical strokes from overpowering noteheads and horizontal lines.

### The test case

`stems.musicxml`: all stemmed notes across the score rendered with default stem and stave-line weights; the check compares average inked stem width against stave-line thickness in pixels.

### What to look for

In measure 1, the blue reference line marks the stave-line inked thickness and the box around the first stem reports the average stem inked width; the box turns green when stems are thinner than stave lines.
