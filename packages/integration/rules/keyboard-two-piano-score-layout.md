### The rule

In score arrangement for piano duet, two pianos, or two keyboards, give each keyboard pair its own curly brace and joined barlines, keeping barlines separated between the two keyboards while the systemic left barline joins the entire system. See Behind Bars pp. 330–331.

### The test case

`keyboard-two-piano.musicxml` defines two separate two-stave piano parts (`Piano I` and `Piano II`), each with `<part-symbol>brace</part-symbol>` and no `<part-group>` joining their barlines.

- Measure 1–2. Two braced grand staves stacked in score format; internal barlines should join each piano's two staves without crossing the gap between Piano I and Piano II, while the left systemic line spans all four staves.

### Renderers

- Behind Bars: agrees, each piano pair has its own curly brace and joined barlines, broken between Piano I and Piano II, with a continuous left systemic barline
- MuseScore: agrees, draws separate braces and joined barlines for each piano pair with a break between Piano I and Piano II and a continuous left systemic barline
- Verovio: agrees, draws separate braces and joined barlines for each piano pair with a break between Piano I and Piano II and a continuous left systemic barline
- OSMD: agrees, draws separate braces and joined barlines for each piano pair with a break between Piano I and Piano II and a continuous left systemic barline

### Checks

1. Does each piano pair have its own curly brace and joined barlines with no barline crossing between Piano I and Piano II, while the left systemic barline joins all four staves?
   Crop: measure 1, part 1, 2 above, 22 below
   Book: p. 331, 0.12 0.37 0.25 0.22
