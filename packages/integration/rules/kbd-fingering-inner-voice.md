### The rule

On a stave with two voices, place upper-voice fingering above the stave and lower-voice (inner-part) fingering below the lower-voice notes or stem ends so each numeral stays close to its own part. See Behind Bars p. 309.

### The test case

`keyboard-fingering.musicxml` gives each fingering rule its own measure.

- Measure 3. Staff 1 carries two voices with no explicit `placement` on `<fingering>`: voice 1 plays C5 and D5 (fingerings 4, 5) with up-stems, and voice 2 plays E4 and F4 (fingerings 1, 2) with down-stems.

### Renderers

- Behind Bars: agrees, places upper-voice fingerings above the stave and inner-part lower-voice fingerings below its stem ends
- MuseScore: differs, places upper-voice fingerings above the stave and lower-voice fingerings inside the stave directly over the lower noteheads
- Verovio: differs, stacks both voices' fingerings above the stave
- OSMD: differs, places both voices' fingerings above the stave

### Checks

1. Are voice 1’s fingerings (4, 5) placed above the treble stave and voice 2’s fingerings (1, 2) placed below voice 2’s notes or stem ends?
   Crop: measure 3, staff 1, 6 above, 4 below
   Book: p. 309, 0.58 0.40 0.21 0.17
