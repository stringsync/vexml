### The rule

Keep the middle of a tie’s curve off a stave line, so a tie inside the stave usually cuts through one. A curve whose middle lies along a line is hard to see. See Behind Bars p. 61.

### The test case

`ties.musicxml` gives each case its own measure.

- Measure 1 (a tie below an A4), measure 10 (a two-note chord tied, B4 and D5) and measure 24 (F4 and A4 tied).

### Renderers

- Behind Bars: agrees, each tie's middle in a space
- MuseScore: agrees, the A4 tie bows below the bottom line and the chord ties clear the lines
- Verovio: differs, the upper chord tie's middle sits on the top line
- OSMD: differs, the A4 tie's middle runs along the bottom line

### Checks

1. Does the middle of the A4 tie sit clear of the bottom line?
   Crop: measure 1, 3 above, 4 below
2. Do the middles of the chord ties sit in spaces, not on lines?
   Crop: measure 10, 4 above, 3 below
3. Do the middles of these chord ties sit in spaces?
   Crop: measure 24, 3 above, 4 below

### Why a person decides

The apex of a ¾-space tie can only sit so far from a line, and the renderers differ. The user approved vexml's ties as drawn (decisions.md, 2026-11-26), so the checks are judged by eye.
