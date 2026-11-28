### The rule

When rests occur in alternative vocal rhythms on one stave, keep complete bar lengths in both voices and draw the alternative rhythm’s rests at cue size. See Behind Bars p. 450.

### The test case

`vocal-alt-underlay.musicxml` gives each alternative-underlay rule its own measures.

- Measure 5. Voice 1 opens with a full-sized eighth rest followed by C5 eighth, B4 quarter, A4 half; voice 2 carries cue-sized notes and cue-sized eighth and quarter rests (`<cue/><rest/><type size="cue">`).

### Renderers

- Behind Bars: agrees, draws the alternative rhythm’s rests smaller than full-sized rests
- MuseScore: agrees, draws voice 2’s cue eighth and quarter rests visibly smaller than voice 1’s full-sized rest
- Verovio: agrees, draws voice 2’s cue eighth and quarter rests visibly smaller than voice 1’s full-sized rest
- OSMD: agrees, draws voice 2’s cue eighth and quarter rests visibly smaller than voice 1’s full-sized rest

### Checks

1. Are voice 2’s cue rests drawn visibly smaller than voice 1’s full-sized eighth rest and clear of the notes?
   Crop: measure 5, 4 above, 7 below
   Book: p. 450, 0.19 0.45 0.63 0.09
