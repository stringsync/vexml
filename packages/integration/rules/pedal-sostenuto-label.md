### The rule

Label the sostenuto (middle) pedal `Sost. Ped.` (not `Ped.` or ambiguous `S.P.`), with an extension line showing its duration. See Behind Bars p. 336.

### The test case

`piano-pedalling.musicxml` encodes `<pedal type="sostenuto" number="2" line="yes" sign="yes"/>` spanning measure 2.

- Measure 2. The sostenuto pedal should display a distinct sostenuto label (`Sost. Ped.`) followed by a solid extension line ending in a release hook.

### Renderers

- Behind Bars: agrees, labels the sostenuto pedal `Sost. Ped.` with a solid extension line and upward release hook
- MuseScore: differs, labels the sostenuto pedal `Sost.` without `Ped.` on a solid extension line with upward release hook
- Verovio: differs, draws a plain pedal bracket with no `Sost. Ped.` label
- OSMD: differs, prints `Ped` instead of `Sost. Ped.`

### Checks

1. Is the sostenuto pedal labelled `Sost. Ped.` with a solid extension line terminating in an upward release hook?
   Crop: measure 2, staff 2, 2 above, 9 below
   Book: p. 333, 0.30 0.24 0.30 0.06
