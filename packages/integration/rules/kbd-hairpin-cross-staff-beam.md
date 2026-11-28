### The rule

A crescendo or diminuendo hairpin in a cross-staff beamed passage should remain clear of beams and never intersect a beam (angling through a stave or sitting clear in the inter-staff space or outside the system). See Behind Bars pp. 323–324.

### The test case

`keyboard-dynamics-glissando.musicxml`, measure 2: cross-staff beamed eighth notes with an unplaced crescendo hairpin leading to `f` on the last eighth note.

### Renderers

- Behind Bars: agrees, keeps the crescendo hairpin completely clear of the cross-staff beam
- MuseScore: agrees, places the crescendo hairpin in the inter-staff space above both cross-staff beams with clear separation
- Verovio: differs, draws the crescendo hairpin directly across both cross-staff beams so they intersect
- OSMD: differs, places both beams above the upper stave rather than between staves, leaving the hairpin in the inter-staff space

### Checks

1. Does the crescendo hairpin in measure 2 stay clear of the cross-staff beams without intersecting them?
   Crop: measure 2, 2 above, 17 below
   Book: p. 324, 0.16 0.17 0.30 0.13
