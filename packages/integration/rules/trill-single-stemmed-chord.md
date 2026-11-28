### The rule

On a single-stemmed chord playing a double trill, draw two trill signs, placed either on opposite sides of the chord or stacked above it (stacked above when a third voice shares the stave). See Behind Bars p. 135.

### The test case

`trills.musicxml` isolates trill design and placement rules by measure.

- Measure 3. A single-stemmed `A4-C5` half-note chord where both notes carry `<trill-mark/>`.

### Renderers

- Behind Bars: agrees, draws two distinct `tr` signs for the double trill
- MuseScore: agrees, stacks two `tr` signs above the chord
- Verovio: agrees, stacks two `tr` signs above the chord
- OSMD: differs, draws only one `tr` sign

### Checks

1. Does the single-stemmed chord in measure 3 show two `tr` signs (either opposite sides or stacked above) rather than collapsing them into one?
   Crop: measure 3, 6 above, 5 below
   Book: p. 135, 0.28 0.81 0.44 0.08
