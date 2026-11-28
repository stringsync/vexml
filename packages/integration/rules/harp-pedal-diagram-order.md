### The rule

Draw a harp pedal diagram as raised (flat), centred (natural), and lowered (sharp) ticks on a horizontal line in D-C-B and E-F-G-A order, with a vertical divider separating the three left-foot pedals from the four right-foot pedals. See Behind Bars p. 355.

### The test case

`harp-marks.musicxml` uses a single-staff treble harp part.

- Measure 1. A complete seven-pedal `<harp-pedals>` diagram (`D♭ C♮ B♯ | E♮ F♯ G♭ A♮`, `placement="above"`) over a whole note `C5`.

### Renderers

- Behind Bars: agrees, draws raised (flat), centred (natural), and lowered (sharp) ticks on a horizontal line in D-C-B / E-F-G-A order with a vertical divider
- MuseScore: agrees, draws raised, centred, and lowered ticks in D-C-B / E-F-G-A order separated by a vertical divider
- Verovio: differs, omits `<harp-pedals>`
- OSMD: differs, omits `<harp-pedals>`

### Checks

1. In measure 1, does the harp pedal diagram draw raised, centred, and lowered ticks in D-C-B / E-F-G-A order with a vertical divider between left- and right-foot pedals?
   Crop: measure 1, 6 above, 4 below
   Book: p. 355, 0.59 0.60 0.22 0.12
