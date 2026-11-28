### The rule

Draw slurs on beamed drum grace-note groups (closed rebounding strokes) on the notehead side curving smoothly to the main note, while leaving unslurred grace groups (open alternating strokes) without slurs (Behind Bars p. 297).

### The test case

`percussion-drums.musicxml`: a five-line percussion stave with beamed 2-note and 3-note sixteenth grace groups on `G4` preceding quarter notes on `G4`, with slurs in measure 1 (closed strokes) and without slurs in measure 2 (open strokes).

### Renderers

- Behind Bars: agrees, curves the grace-note slur below the noteheads (opposite the upward stems) into the main note for closed strokes
- MuseScore: agrees, curves both closed-stroke grace slurs below the noteheads into each main note and omits slurs in measure 2
- Verovio: agrees, curves both closed-stroke grace slurs below the noteheads into each main note and omits slurs in measure 2
- OSMD: agrees, curves both closed-stroke grace slurs below the noteheads into each main note and omits slurs in measure 2

### Checks

1. In measure 1, do the slurs on the 2-note and 3-note beamed grace groups curve on the notehead side (below the up-stemmed notes) cleanly into each following main note?
   Crop: measure 1, 2 above, 2 below
   Book: p. 297, 0.31 0.29 0.37 0.09
