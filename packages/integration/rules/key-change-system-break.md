### The rule

When a key change coincides with a system break, place the cautionary cancelling naturals and new key signature at the end of the first system, and draw only the new key signature (no naturals) at the start of the new system. See Behind Bars p. 93.

### The test case

`keys.musicxml` isolates each key-signature rule by measure.

- Measures 7–8. Measure 7 ends the second system in 3 flats; measure 8 opens the third system (`<print new-system="yes"/>`) in 2 sharps.

### Renderers

- Behind Bars: agrees, places cautionary naturals and new key at the end of system 1, and only the new key at the start of system 2
- MuseScore: agrees, places cautionary 2 sharps at the end of measure 7 and only the 2 sharps (no naturals) at the start of measure 8
- Verovio: differs, omits the cautionary key at the end of measure 7, while drawing only the 2 sharps at the start of measure 8
- OSMD: differs, omits the cautionary key at the end of measure 7, while drawing only the 2 sharps at the start of measure 8

### Checks

1. Does measure 7 show the cautionary key change at the end of the system?
   Crop: measure 7, 3 above, 3 below
   Book: p. 93, 0.19 0.27 0.62 0.13

2. Does measure 8 open the new system with only the 2 sharps (and no cancelling naturals)?
   Crop: measure 8, 3 above, 3 below
   Book: p. 93, 0.19 0.27 0.62 0.13
