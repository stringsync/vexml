### The rule

Keep touched-pitch harmonic diamond noteheads hollow regardless of rhythmic duration (quarter, eighth, or half), without adding a harmonic circle above them. See Behind Bars pp. 418–419.

### The test case

`strings-pizz-harmonics.musicxml` attaches `<harmonic><natural/><touching-pitch/></harmonic>` across quarter, eighth, and half durations.

- Measure 9. Quarter C5, beamed eighths B4 and A4, and half G4, all marked as touching-pitch natural harmonics.

### Renderers

- Behind Bars: agrees, draws all touched-pitch harmonic diamonds hollow regardless of duration and omits any harmonic circle
- MuseScore: differs, fills quarter and eighth diamond noteheads black (leaving only the half note hollow) and adds harmonic circles above
- Verovio: differs, fills quarter and eighth diamond noteheads black (leaving only the half note hollow) and adds harmonic circles above
- OSMD: differs, fills quarter and eighth diamond noteheads black (leaving only the half note hollow) and adds `0` marks

### Checks

1. Are all four diamond noteheads in measure 9 (quarter, two eighths, and half) hollow rather than filled, with no harmonic circle above them?
   Crop: measure 9, 4 above, 2 below
   Book: p. 418, 0.14 0.28 0.73 0.09
