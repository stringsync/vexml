### The rule

Place vocal breath marks above the stave just before the next note or barline, using a tick (`✓`) when breath time is subtracted from the previous note and a comma (`,`) when the note keeps its full value with a brief added pause. See Behind Bars p. 436.

### The test case

`vocal-slurs-breathing.musicxml` places both a tick breath mark and a comma breath mark on a vocal line without explicit `placement` in measure 4.

- Measure 4. Four quarter notes with lyrics; beat 2 carries `<breath-mark>tick</breath-mark>` and beat 4 carries `<breath-mark>comma</breath-mark>`.

### Renderers

- Behind Bars: agrees, places breath marks above the stave before the next note or barline using a tick for subtracted breath and a comma for an added pause
- MuseScore: agrees, draws a tick (`✓`) above the stave before beat 3 and a comma (`,`) above the stave before the barline
- Verovio: differs, draws a comma (`,`) for both `<breath-mark>tick</breath-mark>` and `<breath-mark>comma</breath-mark>`
- OSMD: differs, draws a comma (`,`) for both `<breath-mark>tick</breath-mark>` and `<breath-mark>comma</breath-mark>`

### Checks

1. In measure 4, do both breath marks sit above the stave just before the next note or barline, with beat 2 drawn as a distinct tick (`✓`) and beat 4 as a comma (`,`)?
   Crop: measure 4, 5 above, 6 below
