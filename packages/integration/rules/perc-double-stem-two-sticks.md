### The rule

Two opposing stems on a single shared notehead indicate striking one percussion instrument simultaneously with two sticks, rather than offsetting two separate noteheads side by side (Behind Bars p. 293).

### The test case

`percussion-two-players.musicxml`, measure 3: a single-line percussion stave with voice 1 and voice 2 both placed on the single line (`B4`, `<stem>` omitted) on beats 1 and 2.

### Renderers

- Behind Bars: agrees, draws one shared notehead with both an upward and a downward stem
- MuseScore: agrees, draws one shared notehead per beat with opposing upward and downward stems
- Verovio: agrees, draws one shared notehead per beat with opposing upward and downward stems
- OSMD: agrees, draws one shared notehead per beat with opposing upward and downward stems

### Checks

1. In measure 3, do the two voices on the same line share a single notehead with opposing stems (one up, one down)?
   Crop: measure 3, 3 above, 3 below
   Book: p. 293, 0.30 0.31 0.38 0.07
