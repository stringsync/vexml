### The rule

A keyboard glissando spanning both staves is drawn as a solid diagonal line connecting the start notehead on one stave directly to the target notehead on the other stave. See Behind Bars p. 326.

### The test case

`keyboard-dynamics-glissando.musicxml`, measure 3: a downward cross-staff solid glissando from E5 (staff 1) to C3 (staff 2) on beats 1–2, followed by an upward cross-staff solid glissando from D3 (staff 2) to F5 (staff 1) on beats 3–4.

### Renderers

- Behind Bars: agrees, draws a solid diagonal glissando line crossing between staves directly between each start and end notehead
- MuseScore: agrees, draws diagonal cross-staff glissando lines spanning across both staves between each start and end notehead (using wavy strokes)
- Verovio: agrees, draws solid diagonal glissando lines spanning directly across both staves between the start and end noteheads
- OSMD: differs, fails to cross staves and connects E5 horizontally to F5 on the upper stave instead

### Checks

1. Do both cross-staff glissandos in measure 3 draw a solid diagonal line spanning across the staves between the start and end noteheads?
   Crop: measure 3, 3 above, 15 below
   Book: p. 326, 0.24 0.25 0.50 0.16
