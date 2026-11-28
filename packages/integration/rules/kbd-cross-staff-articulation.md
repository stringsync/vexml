### The rule

On a double-stemmed cross-staff beamed group, place articulation marks next to the relevant noteheads (outside the beam and system centre). See Behind Bars p. 317.

### The test case

`keyboard-cross-staff-beams.musicxml`, measure 4: two cross-staff eighth-note groups with unplaced staccato, accent, and tenuto markings on both upper-stave and lower-stave notes.

### Renderers

- Behind Bars: agrees, places each articulation next to its notehead on the outer side away from the centre beam
- MuseScore: agrees, places upper-stave articulations above upper noteheads and lower-stave articulations below lower noteheads, clear of the centre beam
- Verovio: agrees, places upper-stave articulations above upper noteheads and lower-stave articulations below lower noteheads, clear of the centre beam
- OSMD: differs, places several articulations on the inner side of noteheads and places the first beam above the upper stave

### Checks

1. Do the staccato, accent, and tenuto marks in measure 4 sit beside their noteheads (above upper-stave notes and below lower-stave notes) rather than colliding with the centre beam?
   Crop: measure 4, 3 above, 16 below
   Book: p. 317, 0.34 0.34 0.32 0.10
