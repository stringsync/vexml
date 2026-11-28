### The rule

Place a `+` sign above the stave over each hand-stopped horn note (including tied notes) and a small open circle (`o`) above the stave over the next open note. See Behind Bars p. 263.

### The test case

`brass.musicxml` measure 1 places `<technical><stopped/></technical>` on an up-stem G4 and a tied pair of down-stem B4s, followed by `<technical><open/></technical>` on a down-stem C5.

- Measure 1. Four quarter notes (G4 stopped, B4 tied to B4 both stopped, C5 open).

### Renderers

- Behind Bars: agrees, places `+` above each hand-stopped note and a small open circle above the next open note
- MuseScore: agrees, places `+` above beats 1 to 3 and a small open circle above beat 4
- Verovio: differs, places `+` above beats 1 to 3 but omits the `<open/>` circle on beat 4
- OSMD: differs, places `+` below the up-stem G4 on beat 1 and omits the `<open/>` circle on beat 4

### Checks

1. Do the `+` signs on beats 1 to 3 and the open circle on beat 4 sit above the stave centred over their noteheads?
   Crop: measure 1, 5 above, 2 below
   Book: p. 263, 0.12 0.68 0.39 0.06
