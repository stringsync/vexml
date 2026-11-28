### The rule

Dynamics that apply to both hands in a keyboard grand staff are centred vertically in the space between the two staves rather than placed below the lower stave. See Behind Bars p. 323.

### The test case

`keyboard-dynamics-glissando.musicxml`, measure 1: four quarter notes in each hand with unplaced `p` on beat 1 and `f` on beat 3 attached to staff 1.

### Renderers

- Behind Bars: agrees, centres shared dynamics vertically in the space between the treble and bass staves
- MuseScore: agrees, centres both `p` and `f` vertically in the space between the two staves
- Verovio: agrees, places both `p` and `f` in the space between the two staves clear of both staves' lines
- OSMD: agrees, centres both `p` and `f` vertically in the space between the two staves

### Checks

1. Are the `p` and `f` dynamics in measure 1 centred vertically in the space between the two staves, clear of both staves' lines?
   Crop: measure 1, 2 above, 15 below
   Book: p. 323, 0.30 0.44 0.41 0.14
