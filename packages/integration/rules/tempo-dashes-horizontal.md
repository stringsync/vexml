### The rule

Keep extension dashes after a gradual tempo alteration horizontal rather than angling them to follow note heights. See Behind Bars p. 184.

### The test case

`tempo-indications.musicxml` spans `accel.` with `<dashes>` across contrasting note heights (E4, A5, F#4, B4) to `Presto`.

- Measures 8–9. `accel.` followed by `<dashes>` running over low E4 and high A5 in measure 8 to `Presto` on beat 3 of measure 9.

### Renderers

- Behind Bars: agrees, keeps the tempo-alteration dashes strictly horizontal across contrasting note heights
- MuseScore: agrees, draws horizontal dashes across measures 8 and 9
- Verovio: differs, omits the extension dashes across measures 8 and 9
- OSMD: differs, omits the extension dashes across measures 8 and 9

### Checks

1. Do the dashes after `accel.` stay horizontal across measures 8 and 9?
   Crop: measure 8, 6 above, 2 below
2. Do the dashes continue at the same horizontal level into measure 9 up to `Presto`?
   Crop: measure 9, 6 above, 2 below
