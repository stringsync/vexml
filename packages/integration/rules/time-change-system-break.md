### The rule

When a time-signature change occurs at a system break, print a cautionary time signature at the end of the preceding system after its closing barline, as well as the new time signature at the start of the new system. See Behind Bars p. 152.

### The test case

`metre-time.musicxml` changes from 5/8 in measure 4 (end of system 2) to 2/4 in measure 5 (start of system 3).

- Measure 4. Closing bar of system 2 before a metre change to 2/4.
- Measure 5. Opening bar of system 3 in 2/4.

### Renderers

- Behind Bars: agrees, prints a cautionary 2/4 after the closing barline at the end of the system as well as at the start of the new system
- MuseScore: agrees, prints a cautionary 2/4 after the closing barline of measure 4 and 2/4 at the start of measure 5
- Verovio: differs, omits the cautionary time signature at the end of measure 4
- OSMD: differs, omits the cautionary time signature after the closing barline of measure 4

### Checks

1. Does measure 4 print a cautionary 2/4 time signature after the closing barline at the end of system 2?
   Crop: measure 4, 3 above, 3 below
   Book: p. 152, 0.25 0.72 0.50 0.06

2. Does measure 5 print the new 2/4 time signature after the clef and key signature at the start of system 3?
   Crop: measure 5, 12 spaces, 3 above, 3 below
   Book: p. 152, 0.25 0.72 0.50 0.06
