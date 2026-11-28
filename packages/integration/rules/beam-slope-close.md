### The rule

When beamed notes are spaced closer than three stave-spaces apart horizontally, the beam should take only a slight slope of ¼ or ½ stave-space regardless of the pitch interval (Behind Bars p. 20). Tight horizontal spacing exaggerates vertical rise into a steep angle unless the slope is kept shallow.

### The test case

`beams.musicxml`: measure 12 holds eight close-set 32nd notes rising from C5 to E6, checking that the average horizontal stem spacing is under 3 stave-spaces and that the beam slopes by ¼ or ½ space.

### What to look for

In measure 12, a blue reference line under the first two stems reports the tight stem spacing (`<3` spaces), while a red box around the triple beam shows a slope of `0` (completely flat) instead of rising by `¼` or `½` space.
