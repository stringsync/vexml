### The rule

Notate guitar music on a single treble stave sounding an octave lower than written, optionally showing the octave-down `8` beneath the treble clef. See Behind Bars p. 373.

### The test case

`guitar-fingering.musicxml` isolates general guitar notation, string numbers, and fingering by measure.

- Measure 1. A treble clef with `<clef-octave-change>-1</clef-octave-change>` followed by four quarter notes (`E4`, `G4`, `B4`, `E5`).

### Renderers

- Behind Bars: agrees, draws a treble clef with `8` directly beneath it
- MuseScore: agrees, draws a treble clef with `8` directly beneath it
- Verovio: agrees, draws a treble clef with `8` directly beneath it
- OSMD: agrees, draws a treble clef with `8` directly beneath it

### Checks

1. Does the opening clef in measure 1 draw a treble clef with a clear octave-down `8` beneath it?
   Crop: measure 1, 3 above, 4 below
   Book: p. 373, 0.30 0.20 0.12 0.05
