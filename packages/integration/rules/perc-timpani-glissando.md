### The rule

Distinguish a struck timpani glissando (a diagonal glissando line paired with a slur so the destination pitch is not re-articulated) from a rolled glissando (a glissando line between notes carrying tremolo strokes) (Behind Bars p. 296).

### The test case

`percussion-timpani.musicxml`: a bass-clef timpani stave with no key signature. Measure 1 pairs solid glissando lines with slurs between B♭2 and F3; measure 2 pairs a solid glissando line with three-stroke single-note tremolos on half notes.

### Renderers

- Behind Bars: agrees, draws both the diagonal glissando line and the slur on struck glissandos, and both tremolo strokes and the glissando line on rolled glissandos
- MuseScore: agrees, pairs glissando lines with slurs in measure 1 and with three-stroke tremolos in measure 2
- Verovio: agrees, pairs straight diagonal glissando lines with slurs in measure 1 and with three-stroke tremolos in measure 2
- OSMD: agrees, pairs straight diagonal glissando lines with slurs in measure 1 and with three-stroke tremolos in measure 2

### Checks

1. In measure 1, do the struck timpani glissandos show both diagonal glissando lines between the noteheads and slurs clear of the lines?
   Crop: measure 1, 2 above, 2 below
   Book: p. 296, 0.38 0.72 0.24 0.06
2. In measure 2, does the rolled timpani glissando show both three-stroke tremolos on the stems and the diagonal glissando line between the noteheads?
   Crop: measure 2, 2 above, 2 below
   Book: p. 296, 0.37 0.83 0.26 0.07
