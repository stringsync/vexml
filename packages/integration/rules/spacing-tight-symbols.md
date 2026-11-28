### The rule

In a dense passage, allow symbols such as inserted clefs and accidentals to come within half a stave space while remaining clear. (Behind Bars p. 43)

### The test case

`symbol-spacing.musicxml` uses an inserted bass clef between a flagged note and an altered eighth.

### Renderers

- Behind Bars: agrees, its p. 43 example lets an inserted clef sit within half a space of the notes and accidental around it
- MuseScore: agrees, about half a space from the flag to the clef and from the clef to the flat
- Verovio: agrees, about half a space either side of the inserted clef (its strip tile shows the system opening instead, as Verovio starts a system at measure 10)
- OSMD: agrees, the flag, clef and flat sit about half a space apart

### Checks

1. Is there half a space between the first note’s flag and the inserted clef?
   Crop: measure 10, 10 spaces
   Book: p. 43, 0.20 0.49 0.27 0.06

2. Is there half a space between the inserted clef and the following accidental?
   Crop: measure 10, 10 spaces
   Book: p. 43, 0.20 0.49 0.27 0.06
