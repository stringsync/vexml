### The rule

Use dotted ties for alternative-text elisions and dotted syllabic slurs for slurs belonging only to the alternative text, nesting the shorter of two overlapping slurs closer to the notes. See Behind Bars p. 451.

### The test case

`vocal-alt-underlay.musicxml` gives each alternative-underlay rule its own measures.

- Measure 6. Beat 1 pairs two beamed A4 eighths joined by a dotted tie (`line-type="dotted"`); beats 2 to 4 carry a solid principal slur over G4 to A4 nested inside a longer dotted alternative slur (`line-type="dotted"`) over G4, A4, and B4, with two verses below.

### Renderers

- Behind Bars: agrees, draws dotted ties and dotted alternative slurs with the shorter solid slur nested closer to the notes
- MuseScore: agrees, draws both the dotted tie and dotted slur clearly dotted with the shorter solid slur clear of the longer dotted slur
- Verovio: agrees, draws both the dotted tie and dotted slur clearly dotted with the shorter solid slur clear of the longer dotted slur
- OSMD: differs, draws both the tie and the outer slur as solid curves rather than dotted

### Checks

1. Are the dotted tie and dotted slur clearly dotted, with the shorter solid slur nested closer to the notes than the longer dotted slur?
   Crop: measure 6, 5 above, 7 below
   Book: p. 451, 0.13 0.46 0.38 0.10
