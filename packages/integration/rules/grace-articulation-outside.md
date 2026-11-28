### The rule

Place articulations on grace notes where they are most conspicuous, usually outside the stave rather than inside, where scaled-down marks are hard to read. See Behind Bars p. 130.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 12. Beat 1 has a slashed grace note (`G4`) with a staccato dot; beat 3 has a slashed grace note (`B4`) with an accent, both with no `placement` set.

### Renderers

- Behind Bars: agrees, draws scaled-down articulations clearly outside the stave
- MuseScore: agrees, draws both staccato and accent outside the stave below the grace notes
- Verovio: agrees, draws both staccato and accent outside the stave below the grace notes
- OSMD: agrees, draws staccato outside the stave below and accent below the grace note

### Checks

1. Are both grace-note articulations (staccato and accent) in measure 12 drawn clearly outside the stave?
   Crop: measure 12, 5 above, 5 below
   Book: p. 130, 0.32 0.72 0.36 0.07
