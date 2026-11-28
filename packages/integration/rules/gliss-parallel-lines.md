### The rule

Parallel glissandos use parallel lines, one per note, however many notes. See Behind Bars p. 143.

### The test case

`glissandos.musicxml` isolates glissando lines by measure.

- Measure 6. A two-note chord `C4`/`E4` sliding to `G4`/`B4`, drawn with two lines.

### Renderers

- Behind Bars: agrees, parallel lines for parallel glissandos
- MuseScore: agrees, two parallel wavy lines
- Verovio: agrees, two parallel lines
- OSMD: agrees, two thin lines

### Checks

1. In measure 6, are there two parallel lines, one per chord note?
   Crop: measure 6, 4 above, 6 below
