### The rule

At the start of a piece, place the time signature after the clef and any key signature; it remains in effect without being repeated on subsequent systems unless the metre changes. See Behind Bars p. 152.

### The test case

`metre-time.musicxml` opens with a treble clef, two sharps and 3/4, then breaks to a new system in measure 2 without changing metre.

- Measure 1. Opening clef, two-sharp key signature, and 3/4 time signature.
- Measure 2. Start of system 2 with the same 3/4 metre.

### Renderers

- Behind Bars: agrees, places the opening time signature after the clef and key signature and omits it on later systems unless the metre changes
- MuseScore: agrees, prints 3/4 after clef and key in measure 1 and omits it on system 2 in measure 2
- Verovio: agrees, prints 3/4 after clef and key in measure 1 and omits it in measure 2
- OSMD: agrees, prints 3/4 after clef and key in measure 1 and omits it on system 2 in measure 2

### Checks

1. Does measure 1 place the 3/4 time signature after the clef and key signature?
   Crop: measure 1, 12 spaces, 2 above, 2 below

2. Does measure 2 omit the unchanged 3/4 time signature at the start of the new system?
   Crop: measure 2, 9 spaces, 2 above, 2 below
