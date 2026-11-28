### The rule

Stack open-string zeros vertically above the stave when two or more notes of a single-stemmed chord are open strings. See Behind Bars pp. 397, 399.

### The test case

`strings-techniques.musicxml` attaches `<open-string/>` to every notehead of single-stemmed chords without explicit `placement`.

- Measure 9. Beat 1: double-stop D4/A4 with both notes open. Beat 3: triple-stop G3/D4/A4 with all three notes open.

### Renderers

- Behind Bars: agrees, stacks one open-string zero per open notehead vertically above the stave
- MuseScore: differs, draws only one open-string circle per chord instead of stacking one per open note
- Verovio: agrees, stacks two open-string circles above the double-stop and three above the triple-stop
- OSMD: differs, draws only one `0` below the double-stop and none on the triple-stop

### Checks

1. In measure 9, are two open-string marks stacked vertically above the stave on the double-stop and three stacked vertically above the stave on the triple-stop without overlapping?
   Crop: measure 9, 6 above, 3 below
   Book: p. 397, 0.35 0.33 0.30 0.075
