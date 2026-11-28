### The rule

Repeat a tied note's accidental on its tied-into note at the start of a new system, so the reader need not look back to the previous system; brackets are optional, and with many tied chords it may be better to leave them off. See Behind Bars p. 80.

### The test case

`accidentals.musicxml` gives each case its own measure.

- Measures 20–21. G#4 whole note tied into the first measure of a new system; the tied-into G#4 repeats its sharp in the MusicXML.

### Renderers

- Behind Bars: agrees, the tied sharp repeated at the start of the new system
- MuseScore: differs, the tied-into G#4 carries no sharp
- Verovio: agrees, the sharp repeated before the tied-into G#4
- OSMD: differs, the tied-into G#4 carries no sharp

### Why a person decides

Gould calls the repeat helpful rather than required, allows brackets, and advises against it for passages of many tied chords; vexml deliberately drops every tied-into accidental, even one the MusicXML prints.

### Checks

1. Does the tied-into G#4 at the start of the new system show its sharp again?
   Crop: measure 21, 3 above, 3 below
   Book: p. 80, 0.19 0.71 0.60 0.07
