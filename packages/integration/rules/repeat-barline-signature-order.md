### The rule

Place a new clef, key signature, or time signature before a forward repeat barline when it opens a repeated section, and after a backward repeat barline when it applies only to the music following the repeat. See Behind Bars pp. 234–235.

### The test case

`repeat-sections.musicxml` tests both directions.

- Measure 5. Forward repeat coinciding with a new key signature (two sharps) and time signature (3/4): signatures must precede the forward repeat barline.
- Measures 5–6. Backward repeat at the end of measure 5 followed by a new bass clef, key cancellation, and 4/4 in measure 6: all three changes must follow the backward repeat barline.

### Renderers

- Behind Bars: agrees, new signatures precede a forward repeat and follow a backward repeat
- MuseScore: differs, places key and time before the forward repeat but places the bass clef before the backward repeat barline
- Verovio: differs, places key and time before the forward repeat and bass clef after the backward repeat, but also adds a courtesy bass clef before the backward repeat
- OSMD: differs, places key and time before the forward repeat and bass clef after the backward repeat, but also adds a courtesy bass clef before the backward repeat

### Checks

1. In measure 5, do the new key and time signatures appear before the forward repeat barline?
   Crop: measure 5, 2 above, 2 below
   Book: p. 234, 0.27 0.63 0.47 0.05
2. Between measures 5 and 6, do the new bass clef, key cancellation, and 4/4 time signature all appear after the backward repeat barline?
   Crop: measure 6, 2 above, 2 below
   Book: p. 235, 0.35 0.45 0.30 0.05
