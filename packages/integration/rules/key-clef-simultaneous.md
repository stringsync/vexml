### The rule

When a clef change and a key change occur together at a barline, place the new clef before the barline and the new key signature after the barline in the new clef. See Behind Bars p. 93.

### The test case

`keys.musicxml` isolates each key-signature rule by measure.

- Measures 9–10. Measure 9 is in treble clef with 2 flats; measure 10 changes simultaneously to bass clef and 2 sharps.

### Renderers

- Behind Bars: agrees, places the new clef before the barline and the new key signature after the barline in the new clef
- MuseScore: agrees, places the new clef before the barline and the new key signature after the barline in the new clef
- Verovio: agrees, places the new clef before the barline and the new key signature after the barline in the new clef
- OSMD: agrees, places the new clef before the barline and the new key signature after the barline in the new clef

### Checks

1. Does the bass clef sit before the barline at the end of measure 9, with the new 2-sharp key signature after the barline in measure 10 in bass clef?
   Crop: measure 10, 3 above, 3 below
   Book: p. 93, 0.30 0.49 0.39 0.055
