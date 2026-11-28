### The rule

Place down-bow and up-bow marks above the stave, aligned horizontally with the first note of the bow stroke and above all other markings. See Behind Bars p. 405.

### The test case

`strings-techniques.musicxml` attaches `<down-bow/>` and `<up-bow/>` alone and alongside slurs and articulations without explicit `placement`.

- Measure 13. Beat 1: down-bow with staccato and opening slur. Beat 3: up-bow with accent. Beat 4: down-bow alone on a down-stem note.

### Renderers

- Behind Bars: agrees, places down-bow and up-bow marks above the stave, aligned with their notehead and above articulations and slurs
- MuseScore: agrees, places down-bow and up-bow marks above the stave, aligned with their notehead and above articulations and slurs
- Verovio: agrees, places down-bow and up-bow marks above the stave, aligned with their notehead and above articulations and slurs
- OSMD: agrees, places down-bow and up-bow marks above the stave, aligned with their notehead and above articulations and slurs

### Checks

1. In measure 13, do all three bowing marks sit above the stave, horizontally aligned with their noteheads, and above the staccato/slur (beat 1) and accent (beat 3)?
   Crop: measure 13, 7 above, 2 below
   Book: p. 405, 0.26 0.34 0.48 0.09
