### The rule

In double-stemmed writing, each separately stemmed part takes a pause: the upper part takes an upright fermata above the stave and the lower part takes an inverted fermata below it. See Behind Bars p. 189.

### The test case

`pauses.musicxml` places two voices on one stave in measure 8, each carrying a default `<fermata>normal</fermata>` (no `type` attribute).

- Measure 8. Voice 1 half notes E5 and D5 (fermata on E5) and voice 2 half notes G4 and F4 (fermata on G4).

### Renderers

- Behind Bars: agrees, draws an upright fermata above the stave for voice 1 and an inverted fermata below the stave for voice 2
- MuseScore: agrees, draws an upright fermata above the stave for voice 1 and an inverted fermata below the stave for voice 2
- Verovio: differs, stacks both upright fermatas above the stave
- OSMD: differs, stacks both upright fermatas above the stave

### Checks

1. Does voice 1 take an upright fermata above the stave and voice 2 an inverted fermata below the stave?
   Crop: measure 8, 6 above, 4 below
