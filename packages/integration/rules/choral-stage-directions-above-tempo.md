### The rule

In stage works, place scene changes and stage directions at the top of the system above tempo indications, and place individual character style directions above the character’s own stave clear of dynamics and notes. See Behind Bars pp. 470–471.

### The test case

`choral-stage-characters.musicxml` places a top-of-system stage direction (`Lights dim. JACK enters, followed by ANN.`) and tempo marking (`Allegro molto`) on Ann’s stave, plus individual character directions (`ANN (to Jack)`, `JACK (surprised)`) paired with `pp` dynamics above each character’s entry.

- Measure 1. The stage direction should sit above `Allegro molto` at the top of the system, and each character direction should sit cleanly above its stave alongside `pp`.

### Renderers

- Behind Bars: agrees, stacks the stage direction above the tempo marking and keeps character directions clear above each stave
- MuseScore: differs, stacks `Allegro molto` above the stage direction `Lights dim. JACK enters...`
- Verovio: differs, stacks `Allegro molto` above the stage direction `Lights dim. JACK enters...`
- OSMD: differs, stacks `Allegro molto` above the stage direction `Lights dim. JACK enters...`

### Checks

1. Does the stage direction sit above `Allegro molto` at the top of the system, with character directions cleanly clear of dynamics and staves?
   Crop: measure 1, part 1, 10 above, 18 below
   Book: p. 470, 0.10 0.68 0.78 0.23
