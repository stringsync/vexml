### The rule

Label an audible glissando line *gliss.* to distinguish it from a silent finger shift, omitting a slur when the second note is plucked and adding one when unplucked. See Behind Bars p. 378.

### The test case

`guitar-techniques.musicxml` isolates audible glissandos in measure 3.

- Measure 3. Two pairs of quarter notes (`E4` to `B4` unslurred, and `D5` to `G4` slurred), each with `<glissando type="start" line-type="solid">gliss.</glissando>`.

### Renderers

- Behind Bars: agrees, prints italic `gliss.` alongside each straight glissando line
- MuseScore: differs, draws a wavy glissando line without printing `gliss.`
- Verovio: differs, draws a straight glissando line without printing `gliss.`
- OSMD: differs, draws a straight glissando line without printing `gliss.`

### Checks

1. Does each glissando in measure 3 print the `gliss.` label alongside the glissando line?
   Crop: measure 3, 5 above, 4 below
   Book: p. 378, 0.16 0.19 0.68 0.10
