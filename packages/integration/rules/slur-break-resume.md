### The rule

Start the carried-over slur at the new system after the clef and key signature, before the note and its accidental. See Behind Bars p. 112.

### The test case

`slurs-structure.musicxml` isolates each rule by measure.

- Measure 2. The first measure of the new system, whose first note has a natural sign and ends the slur.

### Renderers

- Behind Bars: agrees, starts after the key signature, before the natural
- MuseScore: agrees, starts after the key signature
- Verovio: differs, starts at the barline with no clef or key
- OSMD: differs, starts over the clef, before the key signature

### Checks

1. Does the slur in measure 2 begin after the key signature and before the first note?
   Crop: measure 2, 14 spaces, 3 above, 6 below
