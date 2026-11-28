### The rule

Place a vertical square bracket in front of a pizzicato chord to indicate that its notes are plucked simultaneously rather than arpeggiated. See Behind Bars p. 409.

### The test case

`strings-pizz-harmonics.musicxml` attaches `<non-arpeggiate type="bottom"/>` and `<non-arpeggiate type="top"/>` to simultaneous pizzicato chords.

- Measure 1. A three-note half-note chord (G3/D4/B4) and a four-note half-note chord (G3/D4/A4/F#5), each marked with `<non-arpeggiate>` brackets.

### Renderers

- Behind Bars: agrees, places a vertical square bracket in front of simultaneous pizzicato chords
- MuseScore: agrees, draws a vertical square bracket before both chords, clear of the sharp accidental
- Verovio: agrees, draws a vertical square bracket before both chords, clear of the sharp accidental
- OSMD: unavailable, omits `<non-arpeggiate>` brackets

### Checks

1. Does each pizzicato chord in measure 1 have a vertical square bracket spanning its notes to the left of the chord and its accidentals?
   Crop: measure 1, 5 above, 3 below
