### The rule

Do not repeat a tied note's accidental after an ordinary barline within a system: the tie carries it, and a fresh sign would make the held note look re-struck. See Behind Bars pp. 80–81.

### The test case

`accidentals.musicxml` gives each case its own measure.

- Measures 18–19. F#4 whole note tied over the barline; the tied-into F#4 repeats its sharp in the MusicXML, as some exporters write.

### Renderers

- Behind Bars: agrees, no accidental repeated on a note tied over a barline
- MuseScore: agrees, the tied-into F#4 carries no sharp
- Verovio: differs, draws the sharp the MusicXML repeats, under the tie
- OSMD: agrees, the tied-into F#4 carries no sharp

### Checks

1. Does the tied-into F#4 after the barline carry no sharp?
   Crop: measure 19, 3 above, 3 below
