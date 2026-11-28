### The rule

When a tuplet belongs to both vocal rhythms, place its indication above the stave; when only one of the two rhythms has a tuplet, place the tuplet indication on the stem side of that rhythm. See Behind Bars p. 450.

### The test case

`vocal-alt-underlay.musicxml` gives each alternative-underlay rule its own measures.

- Measure 4. Voice 1 has plain quarters B4, A4 and half G4 (stems up); voice 2 has a cue-sized quarter triplet B4, A4, G4 (stems down) with no explicit `placement` on `<tuplet>`.

### Renderers

- Behind Bars: agrees, places the single-voice tuplet indication on the stem side (below the stave) for the down-stem alternative rhythm
- MuseScore: agrees, places the voice-2 triplet bracket below the stave on its stem side
- Verovio: agrees, places the voice-2 triplet bracket below the stave on its stem side
- OSMD: differs, places the voice-2 triplet bracket above the stave

### Checks

1. Does voice 2’s triplet indication sit below the stave on its stem side rather than above the stave?
   Crop: measure 4, 4 above, 8 below
   Book: p. 450, 0.50 0.28 0.34 0.10
