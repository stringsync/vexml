### The rule

Draw two-note tremolo beams at ordinary beam thickness, centred between the stems and detached from them on quarter-note (and shorter) tremolos; half-note tremolos may attach the outer beam or keep all beams detached. See Behind Bars pp. 225–226.

### The test case

`two-note-tremolos.musicxml` isolates each case in its own measure.

- Measure 1. A half-note tremolo (F4 to A4) followed by two quarter-note tremolos (E4 to G4, A4 to C5), each with three strokes.

### Renderers

- Behind Bars: agrees, ordinary beam-thickness strokes positioned near the stem ends, detached from quarter stems (half-note tremolos may attach outer beam or detach all)
- MuseScore: agrees, ordinary beam-thickness strokes near the stem ends, detached from both half- and quarter-note stems
- Verovio: agrees, ordinary beam-thickness strokes near the stem ends, outer beam attached on half notes and detached on quarters
- OSMD: differs, draws thin diagonal slashes midway along the stems rather than beam-thickness bars near stem ends

### Checks

1. Are the tremolo beams on the half-note and quarter-note pairs drawn at ordinary beam thickness, positioned near the stem ends as if beamed, and detached from the quarter-note stems?
   Crop: measure 1, 3 above, 3 below
   Book: p. 226, 0.24 0.30 0.52 0.06
