### The rule

Connect a struck note to a silently depressed diamond note with a dotted tie to convey silent retaking continuity. See Behind Bars p. 338.

### The test case

`piano-silent-keys.musicxml` ties a struck quarter note D3 to a dotted-half diamond notehead D3 using `<tied type="start" line-type="dotted"/>` in measure 2.

- Measure 2. A dotted tie connects the struck quarter note to the silently depressed hollow diamond notehead.

### Renderers

- Behind Bars: agrees, draws a dotted tie connecting the struck note to the silently depressed diamond notehead
- MuseScore: agrees, draws a finely dotted tie connecting the struck quarter note to the diamond half note
- Verovio: agrees, draws a dotted tie connecting the struck quarter note to the diamond half note
- OSMD: differs, draws a solid tie ignoring `line-type="dotted"`

### Checks

1. Does a clearly dotted tie connect the struck quarter note to the silently depressed diamond half note in measure 2?
   Crop: measure 2, 3 above, 3 below
   Book: p. 338, 0.35 0.85 0.30 0.08
