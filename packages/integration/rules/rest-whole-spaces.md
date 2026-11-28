### The rule

When a rest moves off its centred position, it shifts by an exact whole number of stave spaces so its hooks and bars keep their proper alignment with the stave lines (Behind Bars p. 35). Half-space shifts cause rest hooks and bars to collide with lines.

### The test case

`rests-voices.musicxml`: measures 1 through 5 place rests in two-voice writing and measure each rest's vertical displacement in quarter stave-spaces from its single-voice home position in measure 6.

### What to look for

In measures 1 through 5, green boxes over every displaced rest label its integer shift in spaces (such as `-1`, `+1`, `+2`, or `-3`), confirming no fractional-space shift occurs.
