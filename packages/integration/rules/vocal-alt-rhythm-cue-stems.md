### The rule

In two-voice alternative vocal rhythms on one stave, draw the alternative rhythm as cue-sized notes with stems opposing the principal voice, sharing full-sized noteheads on matching undotted pitches. See Behind Bars pp. 449–450.

### The test case

`vocal-alt-underlay.musicxml` gives each alternative-underlay rule its own measures.

- Measure 3. Voice 1 carries full-sized principal-text notes (dotted quarter A4, eighth B4, quarters G4 and A4) with roman lyrics; voice 2 carries cue-sized alternative-rhythm notes (`<cue/>`, `<type size="cue">`, quarter A4, eighth A4, eighth B4, quarters G4 and A4) with italic second-verse lyrics and no explicit `<stem>` directions.

### Renderers

- Behind Bars: agrees, draws the alternative voice at cue size with opposite stems
- MuseScore: agrees, draws voice 2 at cue size with downward stems opposing voice 1’s upward stems
- Verovio: agrees, draws voice 2 at cue size with downward stems opposing voice 1’s upward stems
- OSMD: agrees, draws voice 2 at cue size with downward stems opposing voice 1’s upward stems

### Checks

1. Are voice 2’s cue notes drawn smaller than voice 1’s full-sized notes with stems opposing voice 1?
   Crop: measure 3, 4 above, 7 below
   Book: p. 449, 0.14 0.85 0.72 0.08
