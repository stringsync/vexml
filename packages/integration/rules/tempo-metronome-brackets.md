### The rule

A confirming metronome marking follows its tempo word in brackets on the same horizontal line. See Behind Bars p. 183.

### The test case

`tempo-indications.musicxml` pairs `<words>Tempo I</words>` and `<metronome parentheses="yes">` (`quarter = 72`) in one `<direction>` in measure 7.

- Measure 7. `Tempo I` followed by `(quarter = 72)`.

### Renderers

- Behind Bars: agrees, places `(quarter = 72)` in brackets on the same line immediately after `Tempo I`
- MuseScore: agrees, places `(quarter = 72)` in brackets on the same line immediately after `Tempo I`
- Verovio: agrees, places `(quarter = 72)` in brackets on the same line immediately after `Tempo I`
- OSMD: differs, stacks `quarter = 72` above `Tempo I` without brackets

### Checks

1. Does `(quarter = 72)` appear in brackets immediately following `Tempo I` on the same horizontal line?
   Crop: measure 7, 7 above, 2 below
