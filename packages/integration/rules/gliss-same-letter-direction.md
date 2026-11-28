### The rule

Between notes with the same letter name, the glissando line is angled toward the raised or lowered pitch. See Behind Bars p. 142.

### The test case

`glissandos.musicxml` isolates glissando lines by measure.

- Measure 4. `F4` to `F♯4`, where the line should rise.
- Measure 5. `B4` to `B♭4`, where the line should fall.

### Renderers

- Behind Bars: agrees, line angled toward the raised or lowered pitch
- MuseScore: differs, draws a level wavy line
- Verovio: differs, draws a level line
- OSMD: differs, draws a level line

### Checks

1. In measure 4, does the line tilt upward toward the raised pitch?
   Crop: measure 4, 4 above, 6 below
2. In measure 5, does the line tilt downward toward the lowered pitch?
   Crop: measure 5, 4 above, 6 below

### Why a person decides

Behind Bars tilts the line toward the altered pitch, but MuseScore, Verovio and OSMD all draw a level line, so no consensus picks the treatment.
