### The rule

Rests occurring within a double-stemmed cross-staff beam should sit on their stave (above or below the beam) so that they do not cut through the beam and obscure the rhythm. See Behind Bars p. 319.

### The test case

`keyboard-cross-staff-beams.musicxml`, measure 5: two cross-staff eighth-note groups, the first containing an eighth rest on staff 1 and the second containing an eighth rest on staff 2.

### Renderers

- Behind Bars: agrees, keeps each rest on its stave clear of the cross-staff beam
- MuseScore: agrees, draws both cross-staff beams between staves and keeps the internal eighth rests on their staves clear of the beams
- Verovio: agrees, draws both cross-staff beams between staves and keeps the internal eighth rests on their staves clear of the beams
- OSMD: differs, places both beams above the upper stave with the first rest crowded right beneath the beam

### Checks

1. Do the internal eighth rests in measure 5 stay on their staves clear of the cross-staff beams instead of intersecting them?
   Crop: measure 5, 2 above, 15 below
   Book: p. 319, 0.15 0.17 0.32 0.10
