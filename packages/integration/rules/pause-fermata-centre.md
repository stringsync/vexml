### The rule

Centre the arc of a fermata horizontally on its notehead (on the main-side head of an adjacent second), rest or barline regardless of stem direction. See Behind Bars p. 188.

### The test case

`pauses.musicxml` puts all five centring targets in measure 3.

- Measure 3. Up-stem F4, down-stem D5, adjacent-second chord G4/A4, quarter rest, and right barline, each carrying `<fermata>normal</fermata>`.

### Renderers

- Behind Bars: agrees, centres each fermata on its notehead (G4 on the G4/A4 second), rest, and barline
- MuseScore: agrees, centres each fermata on F4, D5, G4 of the second, quarter rest, and barline
- Verovio: agrees, centres each fermata on F4, D5, G4 of the second, quarter rest, and barline
- OSMD: differs, centres fermatas on the notes and rest but omits the barline fermata

### Checks

1. Are the fermatas centred horizontally on the up-stem F4, down-stem D5, main-side head G4 of the second, quarter rest, and right barline?
   Crop: measure 3, 5 above, 2 below
