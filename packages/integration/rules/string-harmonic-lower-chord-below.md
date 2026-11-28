### The rule

Place the harmonic circle below the stave when only the lower note of a chord is a natural harmonic. See Behind Bars p. 414.

### The test case

`strings-pizz-harmonics.musicxml` attaches `<harmonic><natural/><sounding-pitch/></harmonic>` only to the lower note of single-stemmed double-stops without explicit `placement`.

- Measure 7. Two half-note double-stops (A4/F#5 and G4/D5) where only the lower note is marked as a sounding-pitch natural harmonic.

### Renderers

- Behind Bars: agrees, places the harmonic circle below the stave when only the lower note of a chord is a harmonic
- MuseScore: differs, places the harmonic circle above the stave on both double-stops
- Verovio: differs, places the harmonic circle above the stave on both double-stops
- OSMD: differs, places a `0` above the stave on both double-stops

### Checks

1. In measure 7, do the harmonic circles for both double-stops sit below the stave rather than above?
   Crop: measure 7, 4 above, 4 below
   Book: p. 414, 0.30 0.69 0.40 0.08
