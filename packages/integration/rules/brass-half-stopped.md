### The rule

Notate half-stopped brass notes with a circled plus (`⊕`) centred above the stave over the note. See Behind Bars p. 264.

### The test case

`brass.musicxml` measure 2 places `<technical><half-muted/></technical>` on an up-stem F4, a down-stem D5, and an up-stem A4, separated by an open D5 on beat 3.

- Measure 2. Four quarter notes (F4 half-muted, D5 half-muted, D5 open, A4 half-muted).

### Renderers

- Behind Bars: agrees, uses a circled plus (`⊕`) above the stave for half-stopped notes
- MuseScore: agrees, draws circled plus (`⊕`) signs above the stave over beats 1, 2, and 4 and an open circle over beat 3
- Verovio: differs, omits the `<half-muted/>` circled plus and `<open/>` circle marks
- OSMD: differs, omits the `<half-muted/>` circled plus and `<open/>` circle marks

### Checks

1. Do the circled plus (`⊕`) signs on beats 1, 2, and 4 sit above the stave centred over their noteheads?
   Crop: measure 2, 5 above, 2 below
