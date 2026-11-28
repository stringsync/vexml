### The rule

When a closely following note takes a different dynamic, move a dynamic of three or more letters (such as `ppp`) left so its last letter sits under the note and it clears the next dynamic. See Behind Bars p. 103.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 3. Eighth notes with `ppp` on the first and `ff` on the second.

### Renderers

- Behind Bars: agrees, shifts ppp left so its last letter sits under the first note
- MuseScore: differs, starts ppp at the note and runs it on towards ff
- Verovio: differs, ppp and ff overlap
- OSMD: differs, centres ppp on the note and keeps it clear of ff

### Checks

1. Does the last letter of `ppp` sit under the first note, with the whole word clear of `ff`?
   Crop: measure 3, 2 above, 7 below
   Book: p. 103, 0.43 0.165 0.14 0.055
