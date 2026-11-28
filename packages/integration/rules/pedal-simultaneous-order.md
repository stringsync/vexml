### The rule

When multiple piano pedals overlap simultaneously, stack them vertically beneath the lowest stave in physical order with the damper pedal (`Ped.`) closest to the stave and the sostenuto pedal (`Sost. Ped.`) below it. See Behind Bars pp. 332–333.

### The test case

`piano-pedalling.musicxml` activates both a damper pedal (`number="1"`) and a sostenuto pedal (`number="2"`) simultaneously on staff 2.

- Measure 2. Both `Ped.` and `Sost. Ped.` extension lines span the same four quarter notes on staff 2.

### Renderers

- Behind Bars: agrees, damper pedal sits closest to the lowest stave with sostenuto pedal stacked cleanly below it
- MuseScore: differs, draws only `Sost.` and drops the simultaneous damper pedal line
- Verovio: differs, draws two stacked plain pedal brackets without `Ped.` or `Sost. Ped.` labels
- OSMD: differs, draws only `Ped` and drops the simultaneous sostenuto pedal line

### Checks

1. Are the simultaneous damper (`Ped.`) and sostenuto (`Sost. Ped.`) pedal lines stacked vertically without colliding, with `Ped.` closer to the stave than `Sost. Ped.`?
   Crop: measure 2, staff 2, 2 above, 9 below
   Book: p. 333, 0.30 0.72 0.28 0.20
