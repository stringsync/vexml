### The rule

When overlapping sustained notes on different percussion instruments share a stave, give them separate opposing stems and rests, rejoining into a single line of rhythm when separate stems are no longer needed (Behind Bars p. 286).

### The test case

`percussion-voices.musicxml`: a 2-line percussion stave (`<staff-lines>2</staff-lines>`) with measure 1 holding two overlapping voices (voice 1 on the upper line `D5`, voice 2 on the lower line `B4`, `<stem>` omitted) and measure 2 rejoining into a single voice.

### Renderers

- Behind Bars: agrees, opposing stems (upper voice up, lower voice down) and separated rests in two-voice measure, then single voice
- MuseScore: agrees, upper voice stems up with rest above, lower voice stems down with rest below
- Verovio: agrees, upper voice stems up with rest above, lower voice stems down with rest below
- OSMD: agrees, upper voice stems up with rest above, lower voice stems down with rest below

### Checks

1. In measure 1, do voice 1 and voice 2 take opposing stems (upper voice up, lower voice down) with their rests placed on their respective sides?
   Crop: measure 1, 3 above, 3 below
   Book: p. 286, 0.23 0.42 0.54 0.09
