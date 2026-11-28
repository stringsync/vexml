### The rule

Place the tuplet numeral at the visual centre of the group: centred on the middle duration for an odd-numbered evenly spaced tuplet, between the two middle durations for an even-numbered tuplet, and between an even number or on the middle of an odd number of subdivisions of the middle note. See Behind Bars p. 193.

### The test case

`tuplets-numeral.musicxml` exercises odd, even, and subdivided-middle tuplets.

- Measure 2. Beat 1: beamed 3:2 eighth-note triplet (F4, G4, A4). Beat 2: beamed 6:4 sixteenth-note sextuplet (F4, G4, A4, G4, F4, E4).
- Measure 3. Beat 1: beamed 3:2 eighth-note triplet whose middle eighth subdivides into two sixteenths (G4, A4, B4, G4).

### Renderers

- Behind Bars: agrees, centres the odd numeral on the middle note, the even numeral between the middle pair, and the subdivided-middle numeral between the two middle sixteenths
- MuseScore: agrees, centres the odd `3`, even `6`, and subdivided-middle `3` on the visual centre of each group
- Verovio: agrees, centres the odd `3`, even `6`, and subdivided-middle `3` on the visual centre of each group
- OSMD: agrees, centres the odd `3`, even `6`, and subdivided-middle `3` on the visual centre of each group

### Checks

1. In measure 2, is the `3` centred over the middle note and the `6` centred between the third and fourth notes?
   Crop: measure 2, 3 above, 2 below
   Book: p. 193, 0.27 0.66 0.46 0.07
2. In measure 3, is the `3` centred between the two subdivided middle sixteenth notes?
   Crop: measure 3, 3 above, 2 below
   Book: p. 193, 0.31 0.80 0.23 0.06
