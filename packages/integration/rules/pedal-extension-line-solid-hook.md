### The rule

Draw a pedal extension line as a solid horizontal line (distinguishable from a dotted octave line) ending with an upward vertical hook at the release point. See Behind Bars p. 334.

### The test case

`piano-pedalling.musicxml` encodes two damper pedal spans with `line="yes" sign="yes"` in measure 3.

- Measure 3. Two pedal lines, each opening with `Ped.`, continuing as a solid horizontal line, and closing with an upward vertical release hook.

### Renderers

- Behind Bars: agrees, pedal extension lines are solid horizontal lines terminating in an upward vertical hook
- MuseScore: differs, omits the extension line and release hook on these two-beat `line="yes" sign="yes"` spans, printing only `Ped.`
- Verovio: agrees, draws solid horizontal extension lines terminating in upward vertical release hooks
- OSMD: agrees, draws solid horizontal extension lines terminating in upward vertical release hooks

### Checks

1. Is each pedal extension line drawn as a solid horizontal line terminating with an upward vertical release hook?
   Crop: measure 3, staff 2, 2 above, 7 below
   Book: p. 336, 0.12 0.18 0.36 0.14
