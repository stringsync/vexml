### The rule

The trill line is drawn directly after the `tr` sign, never on top of it. See Behind Bars p. 136.

### The test case

`trill-lines.musicxml` isolates trill lines by measure.

- Measure 1. The first trilled half-note, whose sign and line are compared for contact.

### Renderers

- Behind Bars: agrees, line starts directly after the sign
- MuseScore: agrees, line starts after the sign
- Verovio: agrees, line starts after the sign
- OSMD: agrees, line starts after the sign

### Checks

1. In measure 1, does the trill line begin after the `tr` sign instead of running through it?
   Crop: measure 1, 6 above, 3 below
