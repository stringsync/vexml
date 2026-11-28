### The rule

Draw headless speech notes (`<notehead>none</notehead>`) as stems without noteheads, cleanly joined by their beam and aligned above the spoken text below. See Behind Bars p. 458.

### The test case

`vocal-sounds.musicxml` isolates vocal sound and speech notation rules across measures.

- Measure 4. Four beamed eighth notes on B4 with `<notehead>none</notehead>`, `whispered` above, and lyrics below, followed by a half rest.

### Renderers

- Behind Bars: agrees, draws bare beamed stems with no noteheads above the spoken text
- MuseScore: agrees, draws four bare beamed stems with no noteheads above the lyrics
- Verovio: agrees, draws four bare beamed stems with no noteheads above the lyrics
- OSMD: agrees, draws four bare beamed stems with no noteheads above the lyrics

### Checks

1. Are the four beamed eighth notes drawn as stems without noteheads, cleanly joined by the beam above the lyrics?
   Crop: measure 4, 5 above, 5 below
   Book: p. 458, 0.17 0.56 0.66 0.10
