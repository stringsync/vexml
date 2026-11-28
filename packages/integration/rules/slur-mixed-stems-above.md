### The rule

When a slur spans notes whose stems point both ways, place it above the stave unless a beam is in the way. See Behind Bars p. 110.

### The test case

`slurs.musicxml` isolates each rule by measure.

- Measure 8. A slur over four quarter notes with alternating stem directions.

### Renderers

- Behind Bars: agrees, slur above the stave
- MuseScore: agrees, slur above the stave
- Verovio: agrees, slur above the stave
- OSMD: differs, slur below the stave

### Checks

1. Is the slur in measure 8 above the stave?
   Crop: measure 8, 7 above, 3 below
   Book: p. 110, 0.24 0.345 0.52 0.05
